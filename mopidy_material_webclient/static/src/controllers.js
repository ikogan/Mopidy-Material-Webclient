﻿var controllers = angular.module('mopControllers', []);

controllers.controller('AppCtrl', [
    '$scope', '$mdSidenav', '$mdDialog', '$mdToast', '$location', '$timeout', '$http', 'mopidy', 'lastfm', 'settings',
    function ($scope, $mdSidenav, $mdDialog, $mdToast, $location, $timeout, $http, mopidy, lastfm, settings) {
        // Start now playing off as hidden. We'll show it once we have a queue
        $scope.showNowPlaying = false;
        $scope.volume = {
            value: 0,
            bypass: true,
            timer: null
        };

        settings.get().then(function(settings) {
            $scope.settings = settings['material-webclient'];
        });

        mopidy.then(function (m) {
            m.playback.getCurrentTrack()
                .done(function (track) {
                    $scope.$apply(function () {
                        $scope.nowPlaying = track;
                        $scope.getInfo($scope.nowPlaying);
                    });
                });

            m.playback.getState()
                .done(function (state) {
                    $scope.$apply(function () {
                        $scope.state = state;
                    });
                });

            m.tracklist.getLength().then(function(length) {
                if(length > 0) {
                    $scope.showNowPlaying = true;
                }
            });

            m.playback.getMute().then(function(mute) {
                if(mute) {
                    $scope.volume.value = 0;
                } else {
                    m.playback.getVolume().then(function(volume) {
                        $scope.volume.value = volume;

                        setTimeout(function() {
                            $scope.volume.bypass = false;
                        });
                    });
                }
            });

            m.on(console.log.bind(console));

            m.on('event:tracklistChanged', function(e) {
                m.tracklist.getLength().then(function(length) {
                    $scope.showNowPlaying = (length > 0);
                })
            });

            m.on('event:playbackStateChanged', function (e) {
                $scope.$apply(function () {
                    $scope.state = e.new_state;
                });
            });

            m.on('event:trackPlaybackStarted', function (e) {
                $scope.$apply(function () {
                    $scope.nowPlaying = e.tl_track.track;
                    $scope.getInfo($scope.nowPlaying);
                });
            });

            m.on('event:volumeChanged', function(e) {
                $scope.$apply(function() {
                    $scope.volume.bypass = true;
                    $scope.volume.value = e.volume;

                    setTimeout(function() {
                        $scope.volume.bypass = false;
                    }, 0);
                })
            });

            m.on('event:muteChanged', function(e) {
                $scope.$apply(function() {
                    $scope.volume.bypass = true;
                    if(e.mute) {
                        $scope.volume.value = 0;
                    } else {
                        m.playback.getVolume().then(function(data) {
                            $scope.volume.value = data.volume;

                            setTimeout(function() {
                                $scope.volume.bypass = false;
                            }, 0);
                        });
                    }
                });
            });

            $scope.$watch('volume.value', function(oldValue, newValue) {
                if(newValue && !$scope.volume.bypass) {
                    $timeout.cancel($scope.volume.timer);
                    $scope.volume.timer = $timeout(function() {
                        m.playback.setVolume(newValue);
                        m.playback.setMute(false);
                    }, 100);
                }
            });

            m.errback = function (e) {
                console.log(e);
            };

            $scope.play = function () {
                m.playback.play();
            };

            $scope.pause = function () {
                m.playback.pause();
            };
        });

        $scope.getInfo = function (track) {
            if (!track || !track.artists || track.artists.length === 0) {
                return;
            }

            $scope.nowPlaying.hasMetadata = true;

            lastfm.getTrack(track).success(function (trackInfo) {
                var t = trackInfo.track;
                if (!t) {
                    return;
                }

                if (t.album &&
                    t.album.image &&
                    t.album.image.length > 0) {
                    $scope.nowPlaying.album = t.album;
                    $scope.nowPlaying.album.images = [];
                    for (var i = 0; i < t.album.image.length; i++) {
                        $scope.nowPlaying.album.images.push(t.album.image[i]['#text']);
                    }
                }
            });
        };

        $scope.goTo = function (path) {
            $location.path(path);
            $mdSidenav('left').toggle();
        };

        $scope.toggleSidenav = function (menuId) {
            $mdSidenav(menuId).toggle();
        };

        $scope.globalSearch = function($event) {
            $mdDialog.show({
                targetEvent: $event,
                template:
                    '<md-dialog aria-label="Search Dialog">' +
                        '   <form name="form" ng-submit="search()">' +
                        '       <md-dialog-content>' +
                        '           <md-input-container>' +
                        '               <label>Query</label>' +
                        '               <input type="text" required ng-model="query" />' +
                        '           </md-input-container>' +
                        '       </md-dialog-content>' +
                        '       <div class="md-actions" layout="row" layout-align="center center">' +
                        '           <md-button ng-click="cancel()">Cancel</md-button>' +
                        '           <md-button ng-click="search()" class="md-primary" ng-disabled="form.$invalid">Search</md-button>' +
                        '       </div>' +
                        '   </form>' +
                    '</md-dialog>',
                controller: ['$scope', '$mdDialog', '$location', function($scope, $mdDialog, $location) {
                    $scope.search = function() {
                        $location.path('search/' + encodeURIComponent($scope.query));
                        $mdDialog.hide();
                    };

                    $scope.cancel = function() {
                        $mdDialog.cancel();
                    }
                }]
            })
        };

        $scope.system = function ($event) {

            function DialogController($scope, $mdDialog) {
                $scope.action = function (value) {
                    $mdDialog.hide(value);
                };
                $scope.closeDialog = function () {
                    $mdDialog.cancel();
                };
            }

            $mdDialog.show({
                targetEvent: $event,
                template:
                    '<md-dialog aria-label="List dialog">' +
                        '  <md-dialog-content>' +
                        '    <md-list>' +
                        '      <md-list-item ng-click="action(\'restart\')">' +
                        '        <md-icon class="md-accent">refresh</md-icon><p>Restart</p>' +
                        '      </md-list-item>' +
                        '      <md-list-item ng-click="action(\'about\')">' +
                        '        <md-icon class="md-accent">info</md-icon><p>About</p>' +
                        '      </md-list-item>' +
                        '      <md-list-item ng-click="closeDialog()">' +
                        '        <md-icon>cancel</md-icon><p>Cancel</p>' +
                        '      </md-list-item>' +
                        '    </md-list>' +
                        '  </md-dialog-content>' +
                        '</md-dialog>',
                controller: DialogController
            }).then(function (response) {
                if (response == 'about') {
                    $location.path('about');
                } else if (response == 'restart') {
                    $http.post('/material-webclient/restart').success(function (response) {
                        $mdToast.show(
                            $mdToast.simple()
                            .content(response.message)
                            .hideDelay(3000)
                        );
                    });
                }
                console.log(response);
            });
        };
    }
]);

controllers.controller('LibraryCtrl', [
    '$scope', '$routeParams', '$location', '$window', '$mdBottomSheet', '$sce', 'mopidy', 'lastfm',
    function ($scope, $routeParams, $location, $window, $mdBottomSheet, $sce, mopidy, lastfm) {
        var type = null;
        var uri = null;

        if ($routeParams.type) {
            type = decodeURIComponent($routeParams.type);
        }
        if ($routeParams.uri) {
            uri = decodeURIComponent($routeParams.uri);
            $scope.uri = uri;
        }

        $scope.loading = true;

        mopidy.then(function (m) {
            $scope.mopidy = m;
            m.library.browse(uri).done(
                function (content) {
                    var uris = [];
                    $scope.$apply(function () {
                        $scope.content = content;
                        $scope.loading = false;
                    });

                    for (var i = 0; i < content.length; i++) {
                        if (content[i].type == 'track') {
                            uris.push(content[i].uri);
                        }
                    }

                    if (type) {
                        m.library.getImages(uris).done(function (images) {
                            $scope.$apply(function () {
                                for (var i = 0; i < $scope.content.length; i++) {
                                    var img = images[$scope.content[i].uri];
                                    if (img && img.length > 0) {
                                        $scope.content[i].image = img[0].uri;
                                    }
                                }
                            });
                        });
                    }
                });

            if (type &&
                type != 'directory' &&
                uri.indexOf('podcast') !== 0) {
                m.library.lookup(uri).done(function (info) {
                    $scope.tracks = info;
                    var album;
                    var artist;
                    if (info.length > 0) {
                        album = info[0].album;
                        artist = info[0].artists && info[0].artists.length > 0 ? info[0].artists[0] : null;
                    }

                    for (var i = 1; i < info.length; i++) {
                        var al = info[i].album;
                        if (album && al && al.name != album.name) {
                            album = null;
                        }
                        var ar = info[i].artists && info[i].artists.length > 0 ? info[i].artists[0] : null;
                        if (artist && ar && ar.name != artist.name) {
                            artist = null;
                        }
                    }

                    if (type == 'album' && album) {
                        lastfm.getAlbum(album).success(function (albumInfo) {
                            $scope.albumInfo = albumInfo.album;
                        });
                    }

                    if (type == 'artist' && artist) {
                        lastfm.getArtist(artist).success(function (artistInfo) {
                            $scope.artistInfo = artistInfo.artist;
                        });
                    }
                });
            }
        });

        $scope.asTrusted = function (summary) {
            return $sce.trustAsHtml(summary);
        };

        $scope.goTo = function (ref) {
            if (ref.type != 'track') {
                $location.path('library/' + ref.type + '/' + encodeURIComponent(ref.uri));
            } else {
                $mdBottomSheet.show({
                    templateUrl: 'partials/track-actions.html',
                    controller: 'TrackActionsCtrl',
                    locals: {
                        'track': ref
                    }
                });
            }
        };

        $scope.back = function () {
            $window.history.back();
        };

        $scope.search = function (uri, query) {
            $location.path('search/' + encodeURIComponent(uri) + '/' + encodeURIComponent(query));
        };
    }
]);

controllers.controller('PlaylistsCtrl', [
    '$scope', '$routeParams', '$location', '$mdBottomSheet', 'mopidy',
    function ($scope, $routeParams, $location, $mdBottomSheet, mopidy) {
        var uri = $routeParams.uri;

        mopidy.then(function (m) {
            $scope.mopidy = m;

            m.tracklist.getLength().then(function(length) {
                $scope.haveQueue = length > 0;
            });

            if (uri) {
                $scope.isPlaylist = true;

                m.playlists.lookup(uri).done(
                    function (playlist) {
                        $scope.$apply(function () {
                            $scope.playlist = playlist;
                            $scope.readOnly = playlist.uri.indexOf('m3u:') !== 0;
                            $scope.content = playlist.tracks;

                            var uris = [];
                            for (var i = 0; i < $scope.content.length && i < 9; i++) {
                                uris.push($scope.content[i].uri);
                            }

                            m.library.getImages(uris).done(function (images) {
                                $scope.$apply(function () {
                                    $scope.images = [];
                                    for(var i in images) {
                                        if(images.hasOwnProperty(i) && images[i].length > 0 &&
                                            !_.includes($scope.images, images[i][0].uri)) {
                                                $scope.images.push(images[i][0].uri);
                                        }
                                    }
                                });
                            });
                        });
                    });
            } else {
                m.playlists.asList().done(
                    function (content) {
                        $scope.$apply(function () {
                            $scope.content = content;
                        });
                    });
            }
        });

        $scope.getFontIcon = function (ref) {
            if (ref.uri.indexOf('spotify') === 0) {
                return 'fa-spotify';
            } else if (ref.uri.indexOf('tunein:') === 0) {
                return 'fa-headphones';
            } else if (ref.uri.indexOf('podcast') === 0) {
                return 'fa-rss';
            } else if (ref.uri.indexOf('soundcloud') === 0) {
                return 'fa-soundcloud';
            } else if (ref.uri.indexOf('gmusic') === 0) {
                return 'fa-google';
            } else if ($scope.isPlaylist) {
                return 'fa-music';
            } else {
                return 'fa-folder-o';
            }
        };

        $scope.refreshPlaylists = function() {
            $scope.content = null;

            $scope.mopidy.playlists.refresh().then(function() {
                $scope.mopidy.playlists.asList().then(function(content) {
                    $scope.$apply(function() {
                        $scope.content = content;
                    });
                });
            });
        };

        $scope.goTo = function(ref) {
            if ($scope.isPlaylist) {
                $mdBottomSheet.show({
                    templateUrl: 'partials/track-actions.html',
                    controller: 'TrackActionsCtrl',
                    locals: {
                        'track': ref
                    }
                });
            } else {
                $location.path('playlists/' + ref.uri);
            }
        };

        $scope.replaceQueue = function(startPlayback) {
            $scope.mopidy.tracklist.clear().done(function () {
                $scope.addPlaylistToQueue(function() {
                    if(startPlayback) {
                        $scope.mopidy.playback.play();
                    }
                });
            });
        };

        $scope.addPlaylistToQueue = function(callback) {
            var uris = [];
            for (var i = 0; i < $scope.content.length; i++) {
                uris.push($scope.content[i].uri);
            }

            $scope.mopidy.tracklist.add(null, null, null, uris).done(function () {
                if(callback) {
                    callback();
                }
            });
        };

        $scope.addPlaylistToPlaylist = function() {
            return $scope.mopidy.addToPlaylist($scope.content);
        };

        $scope.remove = function(track, index) {
            $scope.playlist.tracks.splice(index, 1)
            $scope.save();
        };

        $scope.save = function() {
            $scope.mopidy.playlists.save({
                '__model__': $scope.playlist['__model__'],
                name: $scope.playlist.name,
                uri: $scope.playlist.uri,
                tracks: _.map($scope.playlist.tracks, function(track) {
                    return _.omitBy(track, function(value, property) {
                        return property.startsWith('$');
                    });
                })
            });

            return true;
        };
    }
]);

controllers.controller('QueueCtrl', [
    '$scope', '$mdDialog', '$mdToast', 'mopidy', 'lastfm',
    function ($scope, $mdDialog, $mdToast, mopidy, lastfm) {
        mopidy.then(function (m) {

            $scope.mopidy = m;
            m.tracklist.getTlTracks().then(function (tracks) {
                $scope.$apply(function () {
                    $scope.tracks = tracks;
                });

                m.playback.getCurrentTlTrack()
                    .done(function (tltrack) {
                        $scope.$apply(function () {
                            $scope.playing = tltrack;
                            $scope.loading = false;
                            if (tltrack) {
                                $scope.getInfo(tltrack.track);
                            }
                        });
                    });
            });

            m.tracklist.getRandom().done(function (enabled) {
                $scope.$apply(function () {
                    $scope.randomOn = enabled;
                });
            });

            m.tracklist.getRepeat().done(function (enabled) {
                $scope.$apply(function () {
                    $scope.repeatOn = enabled;
                });
            });

            m.tracklist.getConsume().done(function (enabled) {
                $scope.$apply(function () {
                    $scope.consumeOn = enabled;
                });
            });

            m.on('event:tracklistChanged', function () {
                m.tracklist.getTlTracks().then(function (tracks) {
                    if(tracks.length !== tracks) {
                        $scope.$apply(function () {
                            $scope.tracks = tracks;
                        });
                    }
                });
            });

            m.playback.getState()
                .done(function (state) {
                    $scope.$apply(function () {
                        $scope.state = state;
                    });
                });

            m.on('event:playbackStateChanged', function (e) {
                $scope.$apply(function () {
                    $scope.state = e.new_state;
                });
            });

            m.on('event:trackPlaybackStarted', function (e) {
                $scope.$apply(function () {
                    $scope.playing = e.tl_track;
                    $scope.getInfo($scope.nowPlaying);
                });
            });
        });

        $scope.getInfo = function (track) {
            if (!track || track.artists.length === 0) {
                return;
            }
            lastfm.getTrack(track).success(function (trackInfo) {
                var t = trackInfo.track;
                if (!t) {
                    return;
                }

                if (t.album &&
                    t.album.image &&
                    t.album.image.length > 0) {
                    $scope.playing.track.album = t.album;
                    $scope.playing.track.album.images = [];
                    for (var i = 0; i < t.album.image.length; i++) {
                        $scope.playing.track.album.images.push(t.album.image[i]['#text']);
                    }
                }
            });
        };

        $scope.play = function (track) {
            if ($scope.state == 'playing' && track.tlid == $scope.playing.tlid) {
                $scope.mopidy.playback.pause();
            } else {
                $scope.mopidy.playback.play(track);
            }
        };

        $scope.previous = function () {
            $scope.mopidy.playback.previous();
        };

        $scope.next = function () {
            $scope.mopidy.playback.next();
        };

        $scope.toggleRandom = function () {
            $scope.mopidy.tracklist.setRandom(!$scope.randomOn).done(
                function () {
                    $scope.$apply(function () {
                        $scope.randomOn = !$scope.randomOn;
                    });
                });
        };

        $scope.toggleRepeat = function () {
            $scope.mopidy.tracklist.setRepeat(!$scope.repeatOn).done(
                function () {
                    $scope.$apply(function () {
                        $scope.repeatOn = !$scope.repeatOn;
                    });
                });
        };

        $scope.toggleConsume = function () {
            $scope.mopidy.tracklist.setConsume(!$scope.consumeOn).done(
                function () {
                    $scope.$apply(function () {
                        $scope.consumeOn = !$scope.consumeOn;
                    });
                });
        };

        $scope.move = function(track, from, to) {
            $scope.mopidy.tracklist.move(from, from, to);

            return true;
        };

        $scope.remove = function (track, index) {
            $scope.tracks.splice(index, 1);
            $scope.mopidy.tracklist.remove({ tlid: [track.tlid] });
        };

        $scope.clear = function () {
            $scope.mopidy.tracklist.clear();
        };

        $scope.addQueueToPlaylist = function () {
            $scope.mopidy.addToPlaylist(_.map($scope.tracks, function(track) {
                return track.track;
            }));
        };
    }
]);

controllers.controller('SearchCtrl', [
    '$scope', '$routeParams', '$mdBottomSheet', '$location', 'mopidy',
    function ($scope, $routeParams, $mdBottomSheet, $location, mopidy) {

        $scope.albums = [];
        $scope.albumsLoading = true;
        $scope.artists = [];
        $scope.artistsLoading = true;
        $scope.tracks = [];
        $scope.tracksLoading = true;

        var uri = $routeParams.uri ? [decodeURIComponent($routeParams.uri)] : undefined;
        var query = decodeURIComponent($routeParams.query);

        mopidy.then(function (m) {
            $scope.mopidy = m;
            m.library.search({ 'any': query }, uri).then(function (results) {
                $scope.$apply(function () {
                    for (var i = 0; i < results.length; i++) {
                        var library = results[i];

                        console.log(library);

                        $scope.albumsLoading = false;
                        if (library.albums) {
                            for (var j = 0; j < library.albums.length; j++) {
                                $scope.albums.push(library.albums[j]);
                            }
                        }

                        $scope.artistsLoading = false;
                        if (library.artists) {
                            for (var k = 0; k < library.artists.length; k++) {
                                $scope.artists.push(library.artists[k]);
                            }
                        }

                        $scope.tracksLoading = false;
                        if (library.tracks) {
                            for (var l = 0; l < library.tracks.length; l++) {
                                $scope.tracks.push(library.tracks[l]);
                            }
                        }
                    }
                });
            });
        });

        $scope.goto = function (type, uri) {
            if(type === 'track') {
                $mdBottomSheet.show({
                    templateUrl: 'partials/track-actions.html',
                    controller: 'TrackActionsCtrl',
                    locals: {
                        'track': uri
                    }
                });
            } else {
                $location.path('library/' + type + '/' + encodeURIComponent(uri));
            }
        };

        $scope.search = function (query) {
            $location.path('search/' + encodeURIComponent(uri) + '/' + encodeURIComponent(query));
        };
    }
]);

controllers.controller('SettingsCtrl', [
    '$scope', '$http', '$mdToast', 'settings',
    function ($scope, $http, $mdToast, settings) {
        settings.get().then(function (settings) {
            $scope.wifi = $scope.wifi ? $scope.wifi : [];
            $scope.settings = settings;
            if ($scope.wifi.indexOf(settings.network.wifi_network) < 0) {
                $scope.wifi.push(settings.network.wifi_network);
            }
        });

        $http.get('/material-webclient/wifi').success(function (networks) {
            $scope.wifi = $scope.wifi ? $scope.wifi : [];
            for (var i = 0; i < networks.length; i++) {
                if ($scope.wifi.indexOf(networks[i].ssid) < 0) {
                    $scope.wifi.push(networks[i].ssid);
                }
            }
        });

        $scope.save = function () {
            var data = JSON.parse(JSON.stringify($scope.settings));
            settings.save(data).then(function() {
                $mdToast.show(
                    $mdToast.simple()
                        .content(response.message)
                        .hideDelay(3000)
                );
            });
        };
    }
]);

controllers.controller('AboutCtrl', [
    '$scope', '$http', '$mdToast',
    function ($scope, $http, $mdToast) {
        $scope.loading = true;

        $scope.refresh = function () {
            $http.get('/material-webclient/extensions?' + Date.now()).success(function (response) {
                $scope.loading = false;
                var extensions = {};
                angular.forEach(response, function (value, key) {
                    if (key.indexOf('Mopidy') >= 0) {
                        extensions[key] = { current: value };
                    }
                });
                $scope.extensions = extensions;
            });
        };

        $scope.refresh();

        $scope.checkForUpdates = function () {
            $scope.loading = true;
            $http.get('/material-webclient/extensions?outdated=true&' + Date.now()).success(function (response) {
                var message = 'No updates found';
                for (var itm in response) {
                    if ($scope.extensions[itm]) {
                        $scope.extensions[itm].latest = response[itm].latest;
                        message = 'Updates found for installed modules';
                    }
                }
                $scope.loading = false;
                $mdToast.show(
                    $mdToast.simple()
                        .content(message)
                        .hideDelay(3000)
                );
            });
        };

        $scope.update = function (name) {
            $http({
                method: 'POST',
                url: '/material-webclient/extensions',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: 'extension=' + name
            }).success(function (response) {
                $mdToast.show(
                    $mdToast.simple()
                        .content(response.message)
                        .hideDelay(3000)
                );
            });
        };
    }]);

controllers.controller('TrackActionsCtrl', ['$scope', '$mdBottomSheet', 'mopidy', 'track',
    function ($scope, $mdBottomSheet, mopidy, track) {

    mopidy.then(function(m) {
        $scope.addToQueue = function(track) {
            return m.tracklist.index().then(function(index) {
                index = (index === null ? 0 : index+1);
                return { 'index': index, 'track': m.tracklist.add(null, index, null, [track.uri]) };
            });
        };

        $scope.playNext = function() {
            $mdBottomSheet.hide($scope.addToQueue(track));
        };

        $scope.playLast = function() {
            $mdBottomSheet.hide(m.tracklist.add(null, null, null, [track.uri]));
        };

        $scope.playNow = function() {
            $mdBottomSheet.hide($scope.addToQueue(track).then(function(result) {
                if(result.index) {
                    return m.playback.next();
                } else{
                    return m.playback.play();
                }
            }));
        };

        $scope.addToPlaylist = function() {
            $mdBottomSheet.hide(m.addToPlaylist([{
                '__model__': 'Track',
                name: track.name,
                uri: track.uri
            }]));
        };
    });
}]);
