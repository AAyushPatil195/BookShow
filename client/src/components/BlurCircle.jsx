const BlurCircle = ({top="auto", left="auto", right="auto", bottom="auto"}) => {
  return (
    <div className="pointer-events-none absolute -z-10 h-64 w-64 aspect-square rounded-full bg-primary/15 blur-[110px]" style={{top: top, left: left, right: right, bottom: bottom}}>
    </div>
  )
}

export default BlurCircle
