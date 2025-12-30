// src/graphql/queries/products.ts
export const PRODUCTS_QUERY = `
  query Products(
    $filter: ProductFilterInput
    $page: Int
    $limit: Int
  ) {
    products(
      filter: $filter
      page: $page
      limit: $limit
    ) {
      id
      external_id
      name
      price
      brand
      category
      variant
      url
      image
      created_at
      updated_at
      shop
    }
  }
`;
