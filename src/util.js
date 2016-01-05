const emptyFn = () => {};

export const createCorsXhr = (method, url) => {
  let xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  } else if (typeof XDomainRequest !== "undefined") {
    xhr = new XDomainRequest();
    xhr.onload = emptyFn;
    xhr.onprogress = emptyFn;
    xhr.ontimeout = emptyFn;

    xhr.open(method, url);
  } else {
    xhr = null;
  }

  return xhr;
};


export const omit = (obj, ...fields) => {
  if (!obj) { return {}; }
  return keys(obj).reduce((acc, key) => {
    if (fields.indexOf(key) === -1) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

export const assign = (dest, ...sources) => {
  sources.forEach((source) => {
    if (typeof source !== 'object') {
      return;
    }
    keys(source).forEach((key) => {
      dest[key] = source[key];
    });
  });
  return dest;
};

export const keys = (obj) => {
  const keys = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      keys.push(key);
    }
  }
  return keys;
};

export const forEach = (arr, fn) => {
  for (let i = 0; i < arr.length; i++) {
    const result = fn(arr[i]);
    if (result === false) {
      return;
    }
  }
};
