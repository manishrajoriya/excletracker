import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";

interface DocumentResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface ExcelData {
  id: string;
  data: string;
}

// Local storage keys
const LOCAL_STORAGE_KEYS = {
  EXISTING_DATA: "existingData",
  COMMON_DATA: "commonData",
  UNMATCHED_DATA: "unmatchedData",
};

const CompareAndUploadComponent: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingData, setExistingData] = useState<ExcelData[]>([]);
  const [commonData, setCommonData] = useState<ExcelData[]>([]);
  const [unmatchedData, setUnmatchedData] = useState<any[]>([]);

  // Load data from local storage on component mount
  useEffect(() => {
    const loadFromLocalStorage = async () => {
      try {
        const existing = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.EXISTING_DATA
        );
        const common = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.COMMON_DATA
        );
        const unmatched = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.UNMATCHED_DATA
        );

        setExistingData(JSON.parse(existing) || []);
        setCommonData(JSON.parse(common) || []);
        setUnmatchedData(JSON.parse(unmatched) || []);
      } catch (error) {
        console.error("Error loading data from local storage:", error);
      }
    };

    loadFromLocalStorage();
  }, []);

  // Save data to local storage whenever it changes
  useEffect(() => {
    const saveToLocalStorage = async () => {
      try {
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.EXISTING_DATA,
          JSON.stringify(existingData)
        );
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.COMMON_DATA,
          JSON.stringify(commonData)
        );
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + LOCAL_STORAGE_KEYS.UNMATCHED_DATA,
          JSON.stringify(unmatchedData)
        );
      } catch (error) {
        console.error("Error saving data to local storage:", error);
      }
    };

    saveToLocalStorage();
  }, [existingData, commonData, unmatchedData]);

  // Refresh functionality
  const refreshData = async () => {
    setRefreshing(true);
    try {
      setCommonData([]); // Clear common data
      setUnmatchedData([]); // Clear unmatched data
      Alert.alert("Success", "Data refreshed successfully.");
    } catch (error) {
      console.error("Error refreshing data:", error);
      Alert.alert("Error", "Failed to refresh data.");
    } finally {
      setRefreshing(false);
    }
  };

  // Pick and process the new Excel file
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert("Info", "No file selected.");
        return;
      }

      await extractAndCompareExcel(result.assets[0]);
    } catch (error) {
      Alert.alert("Error", "Failed to pick document.");
    }
  };

  // Convert the new Excel file to JSON and compare with existing data
  const extractAndCompareExcel = async (file: DocumentResult) => {
    setUploading(true);
    try {
      // Read the Excel file
      const response = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert Excel to JSON
      const workbook = XLSX.read(response, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Compare new data with existing data
      const { common, unmatched } = findCommonAndUnmatchedData(jsonData, existingData);

      setCommonData(common);
      setUnmatchedData(unmatched);

      if (common.length > 0 || unmatched.length > 0) {
        Alert.alert("Info", "Data processed. You can now share the file.");
      } else {
        Alert.alert("Info", "No data found to process.");
      }
    } catch (error) {
      console.error("Error processing Excel file:", error);
      Alert.alert("Error", "Failed to process and compare Excel file.");
    } finally {
      setUploading(false);
    }
  };

  // Find common and unmatched data
  const findCommonAndUnmatchedData = (newData: any[], existingData: ExcelData[]) => {
    const common = [];
    const unmatched = [];

    for (const row of newData) {
      if (Array.isArray(row) && row.length > 0) {
        const matchedItems = existingData.filter((item) => item.data === row[0]);

        if (matchedItems.length > 0) {
          common.push(matchedItems[0]);
        } else {
          unmatched.push(row);
        }
      }
    }

    return { common, unmatched };
  };

  // Generate and share Excel file
  const generateAndShareExcel = async () => {
    try {
      // Create a combined dataset with two columns
      const combinedData = [];
      const maxLength = Math.max(commonData.length, unmatchedData.length);

      for (let i = 0; i < maxLength; i++) {
        combinedData.push({
          CommonData: commonData[i] ? commonData[i].data : "", // First column: Common Data
          UnmatchedData: unmatchedData[i] ? unmatchedData[i][0] : "", // Second column: Unmatched Data
        });
      }

      // Create a worksheet from the combined data
      const worksheet = XLSX.utils.json_to_sheet(combinedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Convert workbook to base64
      const excelOutput = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

      // Create a temporary file URI
      const fileUri = FileSystem.cacheDirectory + "combined_data.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, excelOutput, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file using expo-sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Share Excel File",
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Error generating or sharing Excel file:", error);
      Alert.alert("Error", "Failed to generate or share Excel file.");
    }
  };

  // Delete common data
  const deleteCommonData = async () => {
    setDeleting(true);
    try {
      // Confirm deletion with the user
      Alert.alert(
        "Confirm Deletion",
        "Are you sure you want to delete the common data?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              // Remove common data from existing data
              const updatedExistingData = existingData.filter(
                (item) => !commonData.some((commonItem) => commonItem.id === item.id)
              );
              setExistingData(updatedExistingData);
              setCommonData([]); // Clear common data
              Alert.alert("Success", "Common data deleted successfully.");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting common data:", error);
      Alert.alert("Error", "Failed to delete common data.");
    } finally {
      setDeleting(false);
    }
  };

  // Memoized buttons to reduce re-renders
  const memoizedButtons = useMemo(() => {
    return (
      <>
        {/* Refresh Button */}
        <TouchableOpacity onPress={refreshData} style={[styles.button, { backgroundColor: "purple" }]}>
          <Text style={styles.buttonText}>{refreshing ? "Refreshing..." : "Refresh Data"}</Text>
        </TouchableOpacity>

        {/* Upload Button */}
        <TouchableOpacity onPress={pickDocument} style={styles.button}>
          <Text style={styles.buttonText}>{uploading ? "Uploading..." : "Upload Excel"}</Text>
        </TouchableOpacity>

        {/* Share Combined Data Button */}
        {(commonData.length > 0 || unmatchedData.length > 0) && (
          <TouchableOpacity
            onPress={generateAndShareExcel}
            style={[styles.button, { backgroundColor: "green" }]}
          >
            <Text style={styles.buttonText}>Share Combined Data</Text>
          </TouchableOpacity>
        )}

        {/* Delete Common Data Button */}
        {commonData.length > 0 && (
          <TouchableOpacity
            onPress={deleteCommonData}
            style={[styles.button, { backgroundColor: "red" }]}
          >
            <Text style={styles.buttonText}>{deleting ? "Deleting..." : "Delete Common Data"}</Text>
          </TouchableOpacity>
        )}
      </>
    );
  }, [refreshing, uploading, deleting, commonData, unmatchedData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload and Compare Excel File</Text>

      {memoizedButtons}

      {/* Loading Indicators */}
      {uploading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 10 }} />}
      {refreshing && <ActivityIndicator size="large" color="purple" style={{ marginTop: 10 }} />}
      {deleting && <ActivityIndicator size="large" color="red" style={{ marginTop: 10 }} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    padding: 15,
    backgroundColor: "blue",
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CompareAndUploadComponent;