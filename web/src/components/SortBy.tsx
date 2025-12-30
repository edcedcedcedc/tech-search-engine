import { MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { SortingOptions } from "../types/ProductFilters";
import { useProductContext } from "../mocks/useProductContextHook";

interface SortOptionsItem {
  label: string;
  value: SortingOptions;
}

const SortBy = () => {
  const { t } = useTranslation();

  // todo: move to store
  const { filters, setFilters } = useProductContext();

  const sortOptions: SortOptionsItem[] = [
    { label: t("Price_Low_To_High"), value: "PRICE_LOW_TO_HIGH" },
    { label: t("Price_High_To_Low"), value: "PRICE_HIGH_TO_LOW" },
  ];

  const handleChange = (event: SelectChangeEvent) => {
    const sort = event.target.value as SortingOptions;
    setFilters((prev) => ({ ...prev, sortBy: sort }));
  };

  return (
    <Select
      labelId="sortby-selector"
      id="sortby-selector"
      value={filters.sortBy}
      variant="outlined"
      onChange={handleChange}
      className="m-0 p-0"
      size="small"
    >
      {sortOptions.map((option) => (
        <MenuItem value={option.value}>{option.label}</MenuItem>
      ))}
    </Select>
  );
};

export default SortBy;
