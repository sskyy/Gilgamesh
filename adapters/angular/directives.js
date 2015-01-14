angular.module("Gilgamesh")
  .component("gmData", function(){
    return {
      scope : true,
      priority:0,
      link : function( $scope, $el, $attrs){
          var tmp = $attrs['gmData'].split("as").map(function(r){ return r.replace(/\s/g,"")})
          var data = (new Function( "return " + tmp[0] ))()
          if( !data ){
            return console.log("failed to read data from dataSource as", tmp[1])
          }
          var alias = tmp[1]
        console.log("setting data", alias)
        $scope[alias] = data
          data.onStatus(function(v, o,obj){
            if( !$scope.$$phase ){
              $scope.$digest()
            }
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



