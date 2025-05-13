import { useEffect } from "react"
import "./common.css"


// TimerBar visually shows a countdown or progress using a horizontal bar.
// Props:
// - percent: (number) how full the bar is, between 0 and 100 (default is 100)
// - colour: (string) base colour class applied to the background container
export default function TimerBar ({percent = 100, colour='red'}) {
  return (
     // Container with a coloured background defined via CSS (e.g., red, blue, etc.)
     <div className={"timer-bar-box timer-bar-bg-"+colour}>
      <svg className='timer-bar' height='100%' width='100%' xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id='timer-gradient-outside'>
            <stop offset='0%' stopColor='#FFFFFF0F' />
            <stop offset='40%' stopColor='#FFFFFF7F' />
            <stop offset='90%' stopColor='white' />
          </radialGradient>
        </defs>
        <rect className="timer-bar-rect"
          height='100%' width={percent+'%'} x='0' y='0' rx='10px' ry='10px'
          fill='url(#timer-gradient-outside)'
        >
        </rect>
      </svg>
    </div>
  )
}