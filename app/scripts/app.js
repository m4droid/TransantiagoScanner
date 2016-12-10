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
    'ngMaterial',
    'LocalStorageModule'
  ])
  .constant('API', {
    getAllStops: 'https://www.transantiago.cl/restservice/rest/getparadas/all',
    getServices: 'https://www.transantiago.cl/restservice/rest/getservicios/all',
    getRoute: 'https://www.transantiago.cl/restservice/rest/getrecorrido/%s',
    getPrediction: 'https://www.transantiago.cl/predictor/prediccion?codsimt=%s&codser=%s',
    getStops: 'https://www.transantiago.cl/restservice/rest/getpuntoparada?lat=%s&lon=%s&bip=0'
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
