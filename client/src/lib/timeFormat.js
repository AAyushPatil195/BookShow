const timeFormat = (minutes)=>{
    const hours = Math.floor(minutes/60)
    const mins = minutes%60;
    return `${hours}hr ${mins}mins`
}

export default timeFormat;