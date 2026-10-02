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
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col hover:border-slate-600 transition-all duration-200 group">
      {/* Prominent Thumbnail with Duration Overlay */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={resource.thumbnail}
          alt={resource.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Real YouTube Duration Badge */}
        {resource.duration && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/85 text-white font-mono text-[11px] font-semibold tracking-wide backdrop-blur-xs border border-white/10 shadow-lg">
            {resource.duration}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Metadata Row: Channel, Duration, Date */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mb-2">
            <span className="font-semibold text-indigo-400 truncate max-w-[150px]" title={resource.channel}>
              {resource.channel}
            </span>
            {resource.duration && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">
                  {resource.duration}
                </span>
              </>
            )}
            {formattedDate && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500 shrink-0">{formattedDate}</span>
              </>
            )}
          </div>

          <h3 className="text-base font-bold text-white line-clamp-2 leading-snug" title={resource.title}>
            {resource.title}
          </h3>

          {/* Why Recommended Section */}
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60">
            <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Why Recommended
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {resource.whyRecommended}
            </p>
          </div>
        </div>

        {/* Action Buttons: Create My Track & Watch on YouTube */}
        <div className="pt-2 space-y-2.5">
          {onCreateTrack && (
            <button
              type="button"
              onClick={() => onCreateTrack(resource)}
              disabled={disableCreateTrack || isCreatingTrack}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-white font-semibold text-xs sm:text-sm transition-all duration-150 shadow-md shadow-emerald-600/25 cursor-pointer"
            >
              {isCreatingTrack ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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

          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-700/80 hover:bg-slate-700 border border-slate-600/80 active:scale-[0.98] text-slate-100 font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer"
          >
            <span>Watch on YouTube</span>
            <span aria-hidden="true" className="text-indigo-300">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
