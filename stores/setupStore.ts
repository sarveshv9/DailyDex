import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { ROUTINE_STORAGE_KEY, SETUP_STORAGE_KEY } from "../constants/storageKeys";

interface SetupState {
  isSetupComplete: boolean | null;
  setIsSetupComplete: (complete: boolean) => void;
  checkSetup: () => Promise<boolean>;
}

export const useSetupStore = create<SetupState>((set) => ({
  isSetupComplete: null,
  setIsSetupComplete: (complete: boolean) => set({ isSetupComplete: complete }),
  checkSetup: async () => {
    try {
      const setup = await AsyncStorage.getItem(SETUP_STORAGE_KEY);
      const routines = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
      const isComplete = setup === "true" || Boolean(routines && routines !== "[]");
      set({ isSetupComplete: isComplete });
      return isComplete;
    } catch {
      set({ isSetupComplete: false });
      return false;
    }
  },
}));
