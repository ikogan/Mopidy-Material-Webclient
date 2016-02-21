var services = angular.module('mopServices', []);

services.factory('mopidy', ['$q', '$rootScope', '$location', '$mdDialog', 'settings',
    function ($q, $rootScope, $location, $mdDialog, settings) {
        var mopidy = new Mopidy();
        return $q(function (resolve, reject) {
            mopidy.on("state:online", function () {
                mopidy.playback.getCurrentTlTrack()
                    .done(function (tltrack) {
                        if(tltrack) {
                            mopidy.nowPlaying = tltrack.track;
                        }

                        settings.updatePageTitle(tltrack ? 'playing' : 'stopped', mopidy.nowPlaying);
                    });

                mopidy.on('event:trackPlaybackStarted', function (e) {
                    mopidy.nowPlaying = e.tl_track.track;
                    settings.updatePageTitle('playing', mopidy.nowPlaying);
                });

                mopidy.on('event:playbackStateChanged', function (e) {
                    settings.updatePageTitle(e.new_state, mopidy.nowPlaying);
                });

                mopidy.getFontIcon = function (ref) {
                    if (ref.type && ref.type.toLowerCase() == 'track') {
                        return 'fa-music';
                    } else {
                        if (ref.uri.indexOf('spotify') === 0) {
                            return 'fa-spotify';
                        } else if (ref.uri.indexOf('tunein:') === 0) {
                            return 'fa-headphones';
                        } else if (ref.uri.indexOf('podcast:') === 0) {
                            return 'fa-rss';
                        } else if (ref.uri.indexOf('soundcloud:') === 0) {
                            return 'fa-soundcloud';
                        } else if (ref.uri.indexOf('gmusic:') === 0) {
                            return 'fa-google';
                        } else if (ref.uri.indexOf('file:') === 0) {
                            return 'fa-music';
                        } else {
                            return 'fa-folder-o';
                        }
                    }
                };

                mopidy.play = function (uri) {
                    mopidy.tracklist.index(mopidy.nowPlaying).then(function (position) {
                        mopidy.tracklist.add(null, position + 1, null, [uri]).then(function (tracks) {
                            mopidy.playback.play(tracks[0]);
                        });
                    });
                };

                mopidy.addToPlaylist = function(tracks) {
                    return $mdDialog.show({
                        controller: ['$scope', '$mdDialog', '$mdToast', function($scope, $mdDialog, $mdToast) {
                            $scope.newPlaylist = false;

                            mopidy.playlists.asList().then(function(playlists) {
                                $scope.playlists = _.filter(playlists, function(playlist) {
                                    return playlist.uri.startsWith('m3u:');
                                });
                            });

                            $scope.cancel = function() {
                                $mdDialog.cancel();
                            };

                            $scope.add = function() {
                                var playlist = $scope.playlists[$scope.playlist];
                                var message;
                                var promise;

                                function updatePlaylist(playlist) {
                                    playlist = {
                                        '__model__': 'Playlist',
                                        name: playlist.name,
                                        uri: playlist.uri,
                                        tracks: _.map(tracks, function(track) {
                                            return _.omitBy(track, function(value, property) {
                                                return property.startsWith('$');
                                            })
                                        })
                                    };

                                    return mopidy.playlists.save(playlist).then(function() {
                                        $mdToast.show(
                                            $mdToast.simple()
                                            .content(message)
                                            .position('bottom')
                                            .hideDelay(1500)
                                        );
                                    });
                                }

                                if($scope.playlist === -1) {
                                    message = 'New playlist ' + $scope.name + ' created';
                                    promise = mopidy.playlists.create($scope.name).then(function(playlist){
                                        return updatePlaylist(playlist);
                                    });
                                } else {
                                    message = 'Playlist ' + playlist.name + ' updated';
                                    promise = mopidy.playlists.lookup(playlist.uri).then(function(pts) {
                                        tracks = _.union(pts.tracks, tracks);
                                        updatePlaylist(playlist);
                                    });
                                }

                                promise.then(function() {
                                    $mdDialog.hide();
                                });
                            };
                        }],
                        templateUrl: 'partials/add-to-playlist-dialog.html',
                        clickOutsideToClose: true
                    });
                };

                resolve(mopidy);
            });
        });
    }
]);

services.factory('lastfm', [
    '$q', '$http',
    function ($q, $http) {
        var key = '2b640713cdc23381c5fb5fc3ef65b576';
        var lastfm = {
            getAlbum: function (album) {
                return $http.get("https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=" + key +
                    "&artist=" + encodeURIComponent(album.artists[0].name) +
                    "&album=" + encodeURIComponent(album.name) +
                    "&format=json");
            },
            getArtist: function (artist) {
                return $http.get("https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&api_key=" + key +
                    "&artist=" + encodeURIComponent(artist.name) +
                    "&format=json");
            },
            getTrack: function (track) {
                return $http.get("https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=" + key +
                    "&artist=" + encodeURIComponent(track.artists[0].name) +
                    "&track=" + encodeURIComponent(track.name) +
                    "&format=json");
            }
        };

        return lastfm;
    }
]);

services.factory('settings', [
    '$q', '$http', '$rootScope',
    function($q, $http, $rootScope) {
        var settings = null;
        var promise = null;

        var service = {
            get: function() {
                var deferred = $q.defer();

                if(settings) {
                    deferred.resolve(settings);
                }

                if(promise) {
                    return promise;
                }

                $http.get('/material-webclient/settings').success(function (settings) {
                    for (var itm in settings) {
                        if (settings.hasOwnProperty(itm)) {
                            var subitm = settings[itm];
                            for (var key in subitm) {
                                if (subitm.hasOwnProperty(key)) {
                                    if (subitm[key] === 'true') {
                                        subitm[key] = true;
                                    }
                                }
                            }
                        }
                    }

                    deferred.resolve(settings);
                });

                promise = deferred.promise;
                return promise;
            },

            save: function(data) {
                var deferred = $q.defer();

                for (var itm in data) {
                    if (data.hasOwnProperty(itm)) {
                        var subitm = data[itm];
                        for (var key in subitm) {
                            if (subitm.hasOwnProperty(key)) {
                                if (typeof subitm[key] === 'boolean') {
                                    subitm[key] = 'true';
                                }
                            }
                        }
                    }
                }

                $http.post('/material-webclient/settings', data)
                    .success(function (response) {
                        settings = data;

                        $q.resolve();
                    });

                return deferred.promise;
            },

            updatePageTitle: function(state, track) {
                if (track && typeof track.artists != 'undefined') {
                    var artists = track.artists.map(
                        function(artist){
                            return artist.name;
                        }).join(", ");
                }

                if(track) {
                    var title = null;
                    if (state == 'playing') {
                        title = '\u25B6 ' + track.name + ' - ' + artists + ' | Mopidy';
                    } else if (state == 'paused') {
                        title = '\u2759\u2759 ' + track.name + ' - ' + artists + ' | Mopidy';
                    }
                }

                service.get().then(function(settings) {
                    if(settings['material-webclient'].title) {
                        $rootScope.title = title ? title : settings['material-webclient'].title;
                        $rootScope.heading = settings['material-webclient'].title;
                    } else {
                        $rootScope.title = $location.host;
                        $rootScope.heading = $location.host;
                    }
                });
            }
        }

        return service;
    }
]);
