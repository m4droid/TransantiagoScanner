'use strict';
/*global configs */

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
    'ngMaterial'
  ])
  .constant('API', {
    getServices: 'http://200.29.15.107/rest_test2/getservicios/all',
    getRoute: 'http://200.29.15.107/rest_test2/getrecorrido/%s',
    getPrediction: 'http://200.29.15.107/predictor/prediccion?codsimt=%s&codser=%s',
    getStops: 'http://200.29.15.107/restservice/rest/getpuntoparada?lat=%s&lon=%s&bip=0'
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
  .config(function ($mdGestureProvider) {
    $mdGestureProvider.skipClickHijack();
  });
  // .config(function (uiGmapGoogleMapApiProvider) {
  //   uiGmapGoogleMapApiProvider.configure(configs.uiGmapGoogleMap);
  // })
  ;
