import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

interface DocumentResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

const UploadComponent = () => {
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert("Info", "No file selected.");
        return;
      }
      extractAndSaveExcel(result.assets[0]);
    } catch (error) {
      Alert.alert("Error", "Failed to pick document.");
    }
  };

  const extractAndSaveExcel = async (file: DocumentResult) => {
    setUploading(true);
    try {
      const response = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(response, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      for (let item of jsonData) {
        if (item && typeof item === "object") {
          await addDoc(collection(db, "excelData"), item);
        } else {
          console.warn("Invalid item skipped:", item);
        }
      }
      Alert.alert("Success", "Excel data saved to Firestore.");    
    } catch (error) {
      console.error("Error processing Excel file:", error);
      Alert.alert("Error", "Failed to process and upload Excel file.");
    }
    setUploading(false);
  };

  return (
    <View>
      <Text>Upload Excel File</Text>
      <TouchableOpacity onPress={pickDocument} style={{ padding: 10, backgroundColor: "blue", borderRadius: 5, marginTop: 10 }}>
        <Text style={{ color: "white" }}>{uploading ? "Uploading..." : "Upload Excel"}</Text>
      </TouchableOpacity>
      {uploading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 10 }} />}
    </View>
  );
};

export default UploadComponent;