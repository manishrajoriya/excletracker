import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import { db } from "@/firebaseConfig";

const DisplayComponent = () => {
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
    <View>
      <Text>Excel Data</Text>
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
};

export default DisplayComponent;