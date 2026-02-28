(function () {

  let count = 0;

  const interval = setInterval(() => {

    document.body.style.backgroundColor =
      count % 2 === 0 ? "rgba(255,0,0,0.2)" : "";

    count++;

    if (count > 6) {
      clearInterval(interval);
      document.body.style.backgroundColor = "";
    }

  }, 300);

})();