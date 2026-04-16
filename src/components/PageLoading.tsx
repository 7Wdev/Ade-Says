type PageLoadingProps = {
  label?: string;
};

export default function PageLoading({ label = 'Loading content' }: PageLoadingProps) {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-atomic="true">
      <m3e-loading-indicator variant="contained" aria-label={label} />
      <span>{label}</span>
    </div>
  );
}
