angular.module("Gilgamesh",[])
  .run(function($rootScope){
    $rootScope.D = D
    $rootScope.E = E
  })
  .gmDirective("gmData", function($rootScope){
    return {
      scope : true,
      priority:97,
      link : function( $scope, $el, $attrs){
        var tmp = $attrs['gmData'].split("as").map(function(r){ return r.replace(/\s/g,"")})
        var data = (new Function( "return " + tmp[0] ))()
        var alias = tmp[1]
        $scope[alias] = data
        data.onStatus(function(){
          console.log( $scope.status )
          //$scope.$digest()
        })
      }
    }
  })
  .gmDirective("userCardForm", function(){
    return {
      //require : "gmSource",
      priority : 98,
      templateUrl: "/adapters/angular/user-card-form.html",
      link : function( $scope, $el, $attrs){
          $scope.user.onStatus("$$saved", function( saved ){
            if( saved ){
              try{
                if($el.attr('onSubmit') ) (new Function( $el.attr('onSubmit')))()
                console.log( $el.attr('onSubmit'))
                console.log( "on submit", saved)

              }catch(e){
                console.log( e )
              }
            }
          })
      }
    }
  })
.gmDirective( "myModal", function(){

    return {
      link : function( $scope, $el, $attrs ){
        $el.css({
          width : "400px",
          position : "absolute",
          margin : "100px auto 0 auto",
          background : "#eee",
          display : "none"
        })

        $el[0].open = function(){
          $el.css("display","block")
        }

        $el[0].hide = function(){
          console.log("closing")
          $el.css("display","none")
        }
      }
    }

  })