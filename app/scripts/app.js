'use strict';

/**
 * @ngdoc overview
 * @name transantiagoScannerApp
 * @description
 * # transantiagoScannerApp
 *
 * Main module of the application.
 */
angular
  .module('transantiagoScannerApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngMaterial',
    'uiGmapgoogle-maps'
  ])
  .constant('API', {
    getServices: 'http://200.29.15.107/rest_test2/getservicios/all',
    getRoute: 'http://200.29.15.107/rest_test2/getrecorrido/%s',
    getPrediction: 'http://200.29.15.107/predictor/prediccion?codsimt=%s&codser=%s'
  })
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .config(function (uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
      // key: 'your api key',
      sensor: false,
      v: '3.20',
      libraries: 'geometry,visualization'
    });
  });
