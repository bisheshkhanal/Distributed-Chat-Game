import './common.css'

/**
 * LoadingPopup shows a loading screen with an animated spinner and optional message.
 * Props:
 * - colour: (string) determines the background color variant of the popup box (default: 'blue')
 * - msg: (string) optional message displayed under the spinner
 */

export default function LoadingPopup({ colour='blue', msg='' }) {

  return (
    <div className="load-overlay">
      <div className={'load-box load-bg-' + colour}>
        <svg className='load-icon' width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id='load-mask-gradient'>
              <stop offset="25%" stop-color="#000000" />
              <stop offset="100%" stop-color="#ffffff" />
            </linearGradient>
            <mask id='load-mask'>
              <rect className='load-rect' x='0' y='0' width='50%' height='50%' fill='url(#load-mask-gradient)' />
            </mask>
          </defs>
          <circle r="40%" cx="50%" cy="50%" fill='none'
            stroke='white' stroke-width='10%' strokeLinecap='round' strokeDasharray='0,6'
            mask='url(#load-mask)' />
        </svg>
        {msg && <p>{msg}</p>}
      </div>
    </div>
  )
}