import ClippyLottie from '@/assets/Clippy.lottie?url'
import { ClippyState } from '@/types/clippy'
import {
  DotLottie,
  DotLottieReact,
  setWasmUrl
} from '@lottiefiles/dotlottie-react'
import { useEffect, useRef } from 'react'

setWasmUrl('/dotlottie-player.wasm')

interface ClippyAvatarProps {
  state: ClippyState
  size?: number
}

/**
 * ClippyAvatar component
 * Renders the Clippy Lottie animation with state-based control
 *
 * Animation segments (estimated from video):
 * - IDLE: 0-200 frames (looping)
 * - THINKING: 200-400 frames (searching animation)
 * - SPEAKING: 400-600 frames (talking animation)
 * - COMPLETE: 600-700 frames (thumbs up)
 * - ERROR: 700-800 frames (confused/shrug)
 */
export function ClippyAvatar({ state, size = 150 }: ClippyAvatarProps) {
  const playerRef = useRef<DotLottie | null>(null)

  useEffect(() => {
    if (!playerRef.current) return

    // Map state to animation segments
    // Note: These frame ranges are estimates and may need adjustment
    // after examining the actual Clippy.lottie file structure
    switch (state) {
      case ClippyState.IDLE:
        playerRef.current.setLoop(true)
        playerRef.current.play()
        break

      case ClippyState.LISTENING:
        // Keep playing current animation with slight speed increase
        playerRef.current.setSpeed(1.2)
        break

      case ClippyState.THINKING:
        // Play searching/loading animation
        playerRef.current.setLoop(true)
        playerRef.current.setSpeed(1)
        playerRef.current.play()
        break

      case ClippyState.SPEAKING:
        // Play talking animation
        playerRef.current.setLoop(true)
        playerRef.current.setSpeed(1)
        playerRef.current.play()
        break

      case ClippyState.COMPLETE:
        // Play success animation once
        playerRef.current.setLoop(false)
        playerRef.current.play()
        break

      case ClippyState.ERROR:
        // Play error/confused animation once
        playerRef.current.setLoop(false)
        playerRef.current.play()
        break
    }
  }, [state])

  return (
    <div
      style={{
        width: size,
        height: size,
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    >
      <DotLottieReact
        src={ClippyLottie}
        loop
        autoplay
        dotLottieRefCallback={(ref) => {
          playerRef.current = ref
        }}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />
    </div>
  )
}
