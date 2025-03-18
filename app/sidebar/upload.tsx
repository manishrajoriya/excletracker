import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

interface DocumentResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

const UploadComponent: React.FC = () => {
  const [uploading, setUploading] = useState(false);

  // Local storage key for saving Excel data
  const LOCAL_STORAGE_KEY = "excelData";

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

      await extractAndSaveExcel(result.assets[0]);
    } catch (error) {
      Alert.alert("Error", "Failed to pick document.");
    }
  };

  // Convert the new Excel file to JSON and save to local storage
  const extractAndSaveExcel = async (file: DocumentResult) => {
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

      // Save each row to local storage
      const savedData = jsonData
        .filter((row) => Array.isArray(row) && row.length > 0) // Filter valid rows
        .map((row: any) => row[0]); // Extract the first column value

      // Save to local storage
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + LOCAL_STORAGE_KEY,
        JSON.stringify(savedData)
      );

      Alert.alert("Success", "Excel data saved to local storage.");
    } catch (error) {
      console.error("Error processing Excel file:", error);
      Alert.alert("Error", "Failed to process and save Excel file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Excel File</Text>
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

export default UploadComponent;