import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import { db } from "@/firebaseConfig";

interface ExcelData {
  id: string;
  [key: string]: any;
}

const DisplayComponent: React.FC = () => {
  const [data, setData] = useState<ExcelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "excelData"));
      const items = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(items);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch data.");
    } finally {
      setLoading(false);
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
      Alert.alert("Success", `Excel file generated at: ${fileUri}`);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      Alert.alert("Error", "Failed to generate Excel file.");
    }
  };

  const renderItem = (item: ExcelData, index: number) => (
    <View key={item.id} style={styles.itemContainer}>
      <Text style={styles.itemText}>{JSON.stringify(item, null, 2)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Excel Data</Text>
      <TouchableOpacity onPress={generateExcelFile} style={styles.button}>
        <Text style={styles.buttonText}>Download Excel</Text>
      </TouchableOpacity>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <ScrollView style={styles.scrollView}>
          {data.map(renderItem)}
        </ScrollView>
      )}
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
    backgroundColor: "green",
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollView: {
    maxHeight: 400,
    width: "100%",
  },
  itemContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 5,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});

export default DisplayComponent;