angular.module("demo")
  .component("modal",function(){
  return {
    restrict : "EA",
    link : function( $scope, $el){
      $el[0].open = function(){
        $el[0].style.display = "block"
        $el[0].dispatchEvent(new Event("open"))
        console.log("event fired")
      }

      $el[0].hide = function(){
        $el[0].style.display = "none"
        $el[0].dispatchEvent(new Event("hide"))
      }

      $el[0].hide()
    }
  }
}).component("modalExtra",function(){
    return {
      restrict : "EA",
      extend : "modal",
      link : function($scope,$el){
        console.log($el[0])
      }
    }
  })