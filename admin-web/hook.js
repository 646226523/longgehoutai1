window.__warnings = []; const _origErr = console.error; console.error = function(){ window.__warnings.push(Array.from(arguments).join(' ')); _origErr.apply(console, arguments); }; 'hook installed'
