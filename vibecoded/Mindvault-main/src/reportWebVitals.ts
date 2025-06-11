const reportWebVitals = (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onPerfEntry({ name: 'web-vitals', value: 'test' });
  }
  console.log('reportWebVitals called');
};

export default reportWebVitals;
