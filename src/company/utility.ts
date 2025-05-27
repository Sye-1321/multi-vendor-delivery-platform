function unflatten(obj: Record<string, any>) {
  const result: any = {};
  for (const key in obj) {
    key.split('.').reduce((acc, part, i, arr) => {
      if (i === arr.length - 1) {
        acc[part] = obj[key];
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, result);
  }
  return result;
}

export default unflatten;