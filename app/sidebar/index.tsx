import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "@/utils/firebaseConfig";

export default function App() {
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "excelData"));
      const items = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(items);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const pickDocument = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (result.canceled) return;
      extractAndSaveExcel(result.assets[0]);
    } catch (error) {
      Alert.alert("Error", "Failed to pick document.");
    }
  };

  const extractAndSaveExcel = async (file:any) => {
    setUploading(true);
    try {
      const response = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(response, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      for (let item of jsonData) {
        await addDoc(collection(db, "excelData"), item);
      }
      Alert.alert("Success", "Excel data saved to Firestore.");
      fetchData();
    } catch (error) {
      console.error("Error processing Excel file:", error);
      Alert.alert("Error", "Failed to process and upload Excel file.");
    }
    setUploading(false);
  };

  const generateExcelFile = async () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelOutput = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      const fileUri = FileSystem.documentDirectory + "exported_data.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, excelOutput, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert("Success", "Excel file generated at: " + fileUri);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      Alert.alert("Error", "Failed to generate Excel file.");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text>Excel File Management</Text>
      <TouchableOpacity onPress={pickDocument} style={{ padding: 10, backgroundColor: "blue", borderRadius: 5, marginTop: 10 }}>
        <Text style={{ color: "white" }}>{uploading ? "Uploading..." : "Upload Excel"}</Text>
      </TouchableOpacity>
      {uploading && <ActivityIndicator size="large" color="blue" style={{ marginTop: 10 }} />}
      <TouchableOpacity onPress={generateExcelFile} style={{ padding: 10, backgroundColor: "green", borderRadius: 5, marginTop: 10 }}>
        <Text style={{ color: "white" }}>Download Excel</Text>
      </TouchableOpacity>
      <ScrollView style={{ marginTop: 20, maxHeight: 300, width: "100%" }}>
        {data.map((item, index) => (
          <View key={index} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" }}>
            <Text>{JSON.stringify(item)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
