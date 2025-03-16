import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";

interface DocumentResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface ExcelData {
  id: string | undefined;
  data: string;
}

const CompareAndUploadComponent: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingData, setExistingData] = useState<ExcelData[]>([]);
  const [commonData, setCommonData] = useState<ExcelData[]>([]);
  const [unmatchedData, setUnmatchedData] = useState<any[]>([]);

  // Fetch existing data from Firebase
  const fetchExistingData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "excelData"));
      const items = querySnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data().data }));
      setExistingData(items);
    } catch (error) {
      console.error("Error fetching existing data:", error);
      Alert.alert("Error", "Failed to fetch existing data.");
    }
  };

  // Refresh functionality
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchExistingData(); // Fetch latest data from Firebase
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
      const common = findCommonData(jsonData, existingData);
      const unmatched = findUnmatchedData(jsonData, existingData);

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

  // Find common data between new and existing data
  const findCommonData = (newData: any[], existingData: ExcelData[]) => {
    const existingDataValues = existingData.map((item) => item.data); // Extract values from Firebase data
    return newData
      .filter((row) => {
        if (Array.isArray(row) && row.length > 0) {
          return existingDataValues.includes(row[0]); // Compare with new Excel data
        }
        return false;
      })
      .map((row) => {
        // Map to include Firebase document ID
        const matchedItem = existingData.find((item) => item.data === row[0]);
        return { id: matchedItem?.id, data: row[0] }; // Include both ID and data
      });
  };

  // Find unmatched data in the new file
  const findUnmatchedData = (newData: any[], existingData: ExcelData[]) => {
    const existingDataValues = existingData.map((item) => item.data); // Extract values from Firebase data
    return newData.filter((row) => {
      if (Array.isArray(row) && row.length > 0) {
        return !existingDataValues.includes(row[0]); // Compare with new Excel data
      }
      return false;
    });
  };

  // Generate and share Excel file without saving to local storage
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

  // Delete common data from Firebase
  const deleteCommonData = async () => {
    setDeleting(true);
    try {
      // Confirm deletion with the user
      Alert.alert(
        "Confirm Deletion",
        "Are you sure you want to delete the common data from the database?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              // Delete each common data item from Firebase
              for (const item of commonData) {
                if (item.id) {
                  const docRef = doc(db, "excelData", item.id); // Create a reference to the document
                  await deleteDoc(docRef); // Delete the document
                } else {
                  console.warn("Skipping item with missing ID:", item);
                }
              }

              // Refresh the data after deletion
              await fetchExistingData();
              setCommonData([]); // Clear common data state
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

  // Fetch existing data on component mount
  useEffect(() => {
    fetchExistingData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload and Compare Excel File</Text>

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