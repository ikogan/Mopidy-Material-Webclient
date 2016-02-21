var directives = angular.module('mopDirectives', []);

directives.directive('mopDragScroll', ['$document', '$rootScope', '$compile', '$interval',
    function($document, $rootScope, $compile, $interval) {
        return {
            priority: 1001,
            restrict: 'A',
            compile: function(element) {
                element.attr('sv-on-start', "$emit('mopDraggingStart')");
                element.attr('sv-on-stop', "$emit('mopDraggingStop')");

                return {
                    post: function(scope, element, attrs) {
                        var bounds = angular.element(document.body).find(attrs.mopDragScrollBounds);
                        var container = angular.element(document.body).find(attrs.mopDragScrollContainer);
                        var scrollUp, scrollDown = null;

                        if(!bounds || bounds.length !== 1) {
                            throw 'Cannot find bounding box specified as ' + attrs.mopDragScrollBounds;
                        }

                        if(!container || container.length !== 1) {
                            throw 'Cannot find container to scroll, specified as ' + attrs.mopDragScrollContainer;
                        }

                        container = container[0];
                        bounds = bounds[0].getBoundingClientRect();

                        function scroll(event) {
                            if(event && event.y < bounds.top) {
                                if(scrollDown) {
                                    $interval.cancel(scrollDown);
                                    scrollDown = null;
                                }

                                if(!scrollUp) {
                                    scrollUp = $interval(function() {
                                        container.scrollTop -= 10;
                                    }, 50);
                                }
                            } else if(event && event.y > bounds.bottom) {
                                if(scrollUp) {
                                    $interval.cancel($scrollUp);
                                    scrollUp = null;
                                }

                                if(!scrollDown) {
                                    scrollDown = $interval(function() {
                                        container.scrollTop += 10;
                                    }, 50);
                                }
                            } else {
                                if(scrollUp) {
                                    $interval.cancel(scrollUp);
                                }

                                if(scrollDown) {
                                    $interval.cancel(scrollDown);
                                }

                                scrollUp = scrollDown = null;
                            }
                        }

                        $rootScope.$on('mopDraggingStart', function() {
                            $document.on('mousemove', scroll);
                        })

                        $rootScope.$on('mopDraggingStop', function() {
                            $document.off('mousemove', scroll);
                            scroll();
                        });
                    }
                }
            }
        }
}]);
