import { useContext } from "react";
import { ProductContext } from "./ProductContext";

export const useProductContext = () => {
  const ctx = useContext(ProductContext);

  if (!ctx) {
    throw new Error(
      "useProductContext must be used inside ProductContext.Provider"
    );
  }

  return ctx;
};
