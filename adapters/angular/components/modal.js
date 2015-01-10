angular.module("demo")
  .component("modal",function(){
  return {
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
})