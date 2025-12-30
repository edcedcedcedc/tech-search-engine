// src/api/graphqlClient.ts
import axios from "axios";

export const ProductFilterApi = axios.create({
  baseURL: "/products/filter/",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});
