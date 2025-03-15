import React from "react";
import { Drawer } from "expo-router/drawer";

export default function Layout() {
  return (
    <Drawer>
      <Drawer.Screen name="upload" options={{ title: "Upload" }} />
      <Drawer.Screen name="display" options={{ title: "Display" }} />
    </Drawer>
  );
}
