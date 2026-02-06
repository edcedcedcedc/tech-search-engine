interface OffersState {
  sortColumn: "price" | "shop" | null;
  sortAscending: boolean;
  setSort: (col: "price" | "shop") => void;
}