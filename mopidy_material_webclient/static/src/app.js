﻿var app = angular.module('MopidyApp', ['ngRoute', 'ngMaterial', 'angular-sortable-view', 'mopControllers', 'mopServices', 'mopDirectives']);

app.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('deep-purple')
        .accentPalette('pink');
});

app.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/queue', {
                templateUrl: 'partials/queue.html',
                controller: 'QueueCtrl'
            }).
            when('/library', {
                templateUrl: 'partials/library.html',
                controller: 'LibraryCtrl'
            }).
            when('/library/:type/:uri', {
                templateUrl: 'partials/library.html',
                controller: 'LibraryCtrl'
            }).
            when('/playlists', {
                templateUrl: 'partials/playlists.html',
                controller: 'PlaylistsCtrl'
            }).
            when('/playlists/:uri', {
                templateUrl: 'partials/playlists.html',
                controller: 'PlaylistsCtrl'
            }).
            when('/search/:uri/:query', {
                templateUrl: 'partials/search.html',
                controller: 'SearchCtrl'
            }).
            when('/settings', {
                templateUrl: 'partials/settings.html',
                controller: 'SettingsCtrl'
            }).
            when('/about', {
                templateUrl: 'partials/about.html',
                controller: 'AboutCtrl'
            })
            .otherwise({
                redirectTo: '/queue'
            });
  }]);
