export default function ResourceCard({
  resource,
  onCreateTrack,
  isCreatingTrack = false,
  disableCreateTrack = false,
}) {
  const formattedDate = resource.publishedAt
    ? new Date(resource.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="su-card-interactive overflow-hidden flex flex-col group">
      {/* Top Badge Header (Screenshot 3 style) */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2">
        <span className="px-3 py-1 rounded-full bg-[#EEF2FF] text-[#3B5BDB] text-[11px] font-bold">
          Video course
        </span>
        {resource.duration && (
          <span className="text-xs font-bold text-[#6E6A8F]">
            {resource.duration}
          </span>
        )}
      </div>

      {/* Prominent Thumbnail with Duration Overlay */}
      <div className="px-5">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1E1B3A] border border-[#E8E4F8]">
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {resource.duration && (
            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#1E1B3A]/90 text-white font-mono text-[11px] font-bold tracking-wide shadow-sm">
              {resource.duration}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3
            className="text-base font-extrabold text-[#1E1B3A] line-clamp-2 leading-snug"
            title={resource.title}
          >
            {resource.title}
          </h3>

          {/* Metadata Row: Channel, Date */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6E6A8F] mt-1.5">
            <span
              className="font-bold text-[#4F7DF3] truncate max-w-[180px]"
              title={resource.channel}
            >
              {resource.channel}
            </span>
            {formattedDate && (
              <>
                <span className="text-[#C7D2FE]">•</span>
                <span className="text-[#726E91] shrink-0">{formattedDate}</span>
              </>
            )}
          </div>

          {/* Why Recommended Section */}
          <div className="mt-3.5 p-3.5 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
            <p className="text-[10px] font-extrabold text-[#3B5BDB] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F7DF3]" />
              Why Recommended
            </p>
            <p className="text-xs text-[#4B4869] leading-relaxed">
              {resource.whyRecommended}
            </p>
          </div>
        </div>

        {/* Action Buttons: Watch on YouTube & Create My Track (Screenshot 3 two-pill footer) */}
        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-white hover:bg-[#F7F5FF] border border-[#DFD9F7] text-[#1E1B3A] font-bold text-xs transition-colors cursor-pointer"
          >
            <span>Watch on YouTube</span>
            <span aria-hidden="true" className="text-[#4F7DF3]">
              ↗
            </span>
          </a>

          {onCreateTrack && (
            <button
              type="button"
              onClick={() => onCreateTrack(resource)}
              disabled={disableCreateTrack || isCreatingTrack}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              {isCreatingTrack ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Track Plan...</span>
                </>
              ) : (
                <>
                  <span>Create My Track</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
