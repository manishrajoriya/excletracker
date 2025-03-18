import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ExcelData {
  id: string;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 10; // Number of items per page for pagination

const DisplayComponent: React.FC = () => {
  const [data, setData] = useState<ExcelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const LOCAL_STORAGE_KEY = "excelData";

  // Load data from local storage on component mount
  useEffect(() => {
    loadDataFromLocalStorage();
  }, []);

  // Load data from local storage
  const loadDataFromLocalStorage = async () => {
    setLoading(true);
    try {
      const cachedData = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      if (cachedData) {
        setData(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error("Error loading data from local storage:", error);
      Alert.alert("Error", "Failed to load data from local storage.");
    } finally {
      setLoading(false);
    }
  };

  // Save data to local storage
  const saveDataToLocalStorage = async (newData: ExcelData[]) => {
    try {
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error("Error saving data to local storage:", error);
      Alert.alert("Error", "Failed to save data to local storage.");
    }
  };

  // Generate and share Excel file
  const generateExcelFile = async () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const excelOutput = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

      const fileUri = FileSystem.documentDirectory + "exported_data.xlsx";
      await FileSystem.writeAsStringAsync(fileUri, excelOutput, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Sharing not supported", "Your device does not support file sharing.");
      }
    } catch (error) {
      console.error("Error generating or sharing Excel file:", error);
      Alert.alert("Error", "Failed to generate or share the Excel file.");
    }
  };

  // Filter data based on search term
  const filteredData = data.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Render each item
  const renderItem = (item: ExcelData, index: number) => (
    <View key={item.id} style={styles.itemContainer}>
      <Text style={styles.itemText}>{JSON.stringify(item, null, 2)}</Text>
      <View style={styles.divider} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Excel Data</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <Text style={styles.countText}>
        Showing {paginatedData.length} of {filteredData.length} items (Total: {data.length})
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={generateExcelFile} style={styles.button}>
          <Text style={styles.buttonText}>Download Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={loadDataFromLocalStorage} style={styles.button}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <ScrollView style={styles.scrollView}>
            {paginatedData.map(renderItem)}
          </ScrollView>
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={styles.paginationButton}
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </>
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
    color: "#333",
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  countText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  itemContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 10,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  paginationButton: {
    padding: 10,
    backgroundColor: "#007bff",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  paginationButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  paginationText: {
    fontSize: 16,
    marginHorizontal: 10,
    color: "#333",
  },
});

export default DisplayComponent;