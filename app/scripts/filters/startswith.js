'use strict';

angular.module('transantiagoScannerApp')
  .filter('startsWith', function () {
    return function (input, prefix) {
      var output = [];

      angular.forEach(input, function (str) {
        if (str.indexOf(prefix) === 0) {
          output.push(str);
        }
      });

      return output;
    };
  });