type MetaProps = {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  author?: string;
  charset?: string; // optional
  httpEquiv?: string; // optional
  itemProp?: string; // optional
};
import { useTranslation } from "react-i18next";

export function Meta({
  title,
  description,
  canonical,
  keywords,
  author,
  charset,
  httpEquiv,
  itemProp,
}: MetaProps) {
  const { t } = useTranslation();
  const metaTitle = title ?? t("Meta_Title", { lng: "ro" });
  const metaDescription = description ?? t("Meta_Description", { lng: "ro" });
  const metaKeywords = keywords ?? t("Meta_Keywords", { lng: "ro" });
  return (
    <>
      {metaTitle && <title>{metaTitle}</title>}
      {metaDescription && <meta name="description" content={metaDescription} />}
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      {author && <meta name="author" content={author} />}
      {charset && <meta charSet={charset} />}
      {httpEquiv && <meta httpEquiv={httpEquiv} />}
      {itemProp && <meta itemProp={itemProp} />}

      {canonical && <link rel="canonical" href={canonical} />}
      <meta name="robots" content="index, follow" />
    </>
  );
}
