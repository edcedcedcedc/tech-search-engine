export const SafariTintController = ({ color }: { color: string }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "6px", // must be >= 3px
        backgroundColor: color,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    />
  );
};
