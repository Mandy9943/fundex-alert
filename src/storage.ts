import fs from "fs";
import path from "path";

const STORAGE_FILE = path.join(__dirname, "addresses.json");

interface AddressData {
  first_token_id: string;
  second_token_id: string;
  address: string;
}

export const saveAddresses = (addresses: AddressData[]) => {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(addresses, null, 2));
};

export const loadAddresses = (): AddressData[] => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading addresses:", error);
  }
  return [];
};
