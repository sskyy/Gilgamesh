(function( global){

  angular.module("Gilgamesh",[])
    .config(["$compileProvider",function( $compileProvider){
      var _compileFnGenerator = $compileProvider.$get[$compileProvider.$get.length-1]

      $compileProvider.$get[$compileProvider.$get.length-1] = function(
        $injector,   $interpolate,   $exceptionHandler,   $http,   $templateCache,   $parse,
        $controller,   $rootScope,   $document,   $sce,   $animate,   $$sanitizeUri){
        var _compile =  _compileFnGenerator($injector,   $interpolate,   $exceptionHandler,   $http,   $templateCache,   $parse,
          $controller,   $rootScope,   $document,   $sce,   $animate,   $$sanitizeUri)

        var _proxy = function( $compileNodes, transcludeFn, maxPriority, ignoreDirective,previousCompileContext ){
          //fix jquery or jqlite
          if( typeof $compileNodes == 'string' ){
            $compileNodes = $($compileNodes)
          }else if( $compileNodes.nodeType ){
            $compileNodes = $($compileNodes)
          }

          if(!global._GM_DIRECTIVE_NAMES){
            console.log("no gm dir defined")
          }else{
            global._GM_DIRECTIVE_NAMES.forEach(function( name ){
              if( $compileNodes[0] && $compileNodes[0].querySelectorAll){
                angular.forEach( $compileNodes[0].querySelectorAll("["+name.replace(/([A-Z])/g,"-$1").toLowerCase()+"]"), function( el ){
                  if( el.getAttribute(global._CACHE_ATTRIBUTE) !== null ) return
                  ++global._CACHE_ID
                  console.log("caching",global._CACHE_ID, name)
                  global._ORIGIN_ELEMENT_CACHE[global._CACHE_ID] = el.cloneNode(true)
                  el.setAttribute(global._CACHE_ATTRIBUTE,global._CACHE_ID)
                })
              }
            })
          }


          return _compile($compileNodes, transcludeFn, maxPriority, ignoreDirective,previousCompileContext)
        }

        for( var i in _compile ){
          _proxy[i] = _compile[i]
        }

        return _proxy
      }

    }])
    .run(["$rootScope",function($rootScope){
      $rootScope.D = D
      $rootScope.E = E
      $rootScope.Ecall = function( id, method ){
        return E(id)[method]
      }
    }])
    .component("gmData", function(){
      return {
        scope : true,
        priority:0,
        link : function( $scope, $el, $attrs){
          var tmp = $attrs['gmData'].split("as").map(function(r){ return r.replace(/\s/g,"")})
          var data = (new Function( "return " + tmp[0] ))()
          var alias = tmp[1]
          $scope[alias] = data
          data.onStatus(function(v, o,obj){
            console.log( "status change", JSON.stringify(obj ))
            if( !$scope.$$phase ){
              $scope.$digest()
            }
          })

          data.watch("$$actions.save",function( v, o){
            console.log("saving", v,o)
          })
        }
      }
    })
    .directive("gmImport",function(){
      return {
        terminal : true,
        priority : 0
      }
    })

})(window||this)


