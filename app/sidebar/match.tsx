import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing"; // Import expo-sharing
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

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

const CompareAndUploadComponent: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [existingData, setExistingData] = useState<ExcelData[]>([]);

  // Fetch existing data from Firebase
  useEffect(() => {
    fetchExistingData();
  }, []);

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
      const commonData = findCommonData(jsonData, existingData);

      if (commonData.length > 0) {
        // Generate a new Excel file with common data
        const fileUri = await generateNewExcel(commonData);

        // Share the generated Excel file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Share Excel File",
          });
        } else {
          Alert.alert("Sharing not available", "Sharing is not available on this device.");
        }
      } else {
        Alert.alert("Info", "No common data found.");
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
    return newData.filter((row) => {
      if (Array.isArray(row) && row.length > 0) {
        return existingDataValues.includes(row[0]); // Compare with new Excel data
      }
      return false;
    });
  };

  // Generate a new Excel file with the common data
  const generateNewExcel = async (commonData: any[]) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(commonData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Write the workbook to a file
      const excelOutput = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      const fileUri = FileSystem.documentDirectory + "common_data.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, excelOutput, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Success", `New Excel file generated at: ${fileUri}`);
      return fileUri; // Return the file URI for sharing
    } catch (error) {
      console.error("Error generating Excel file:", error);
      Alert.alert("Error", "Failed to generate new Excel file.");
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload and Compare Excel File</Text>
      <TouchableOpacity onPress={pickDocument} style={styles.button}>
        <Text style={styles.buttonText}>{uploading ? "Uploading..." : "Upload Excel"}</Text>
      </TouchableOpacity>
      {uploading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 10 }} />}
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