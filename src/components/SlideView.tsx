import type { SlideStyle } from '../types'

// Renders a 16:9 slide that scales with its container (font sizes are defined for a 1920px-wide screen).
// Background priority: video, then image, then built-in preset, then solid color.
export default function SlideView({ content, style, className = '', animate = true, fadeText = false }: {
  content: string; style: SlideStyle; className?: string; animate?: boolean; fadeText?: boolean
}) {
  const showVideo = !!style.bgVideo && animate
  const showImage = !!style.bgImage && !style.bgVideo
  const showPreset = !!style.bgPreset && !style.bgImage && !style.bgVideo
  return (
    <div
      className={`relative w-full overflow-hidden ${animate ? '' : 'wf-still'} ${className}`}
      style={{
        containerType: 'inline-size', aspectRatio: '16 / 9', backgroundColor: style.bgColor,
        backgroundImage: showImage ? `url("${style.bgImage}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
      }}
    >
      {showPreset && <div className={`wfbg wfbg-${style.bgPreset}`} />}
      {showVideo && (
        <video src={style.bgVideo} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }} />
      )}
      {(style.dim ?? 0) > 0 && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(style.dim ?? 0) / 100})` }} />}
      <div
        className="absolute inset-0 flex items-center whitespace-pre-wrap break-words"
        style={{
          padding: '4cqw', justifyContent: style.align === 'left' ? 'flex-start' : style.align === 'right' ? 'flex-end' : 'center',
          textAlign: style.align, color: style.color, fontFamily: `"${style.fontFamily}", sans-serif`,
          fontSize: `${style.fontSize / 19.2}cqw`, lineHeight: 1.25, fontWeight: 600,
          textShadow: style.shadow ? '0 0.06em 0.15em rgba(0,0,0,0.85)' : 'none',
        }}
      >
        <span key={fadeText ? content : 'static'} className={fadeText ? 'wf-textfade' : undefined}>{content}</span>
      </div>
    </div>
  )
}
