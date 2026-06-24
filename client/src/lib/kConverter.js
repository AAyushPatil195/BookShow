export const kConverter = (value) => {
    return value>1000 ? `${(value/1000).toFixed(1)}k` : value
}