angular.module("Gilgamesh",[])
  .gmDirective("gmData", function($rootScope){
    return {
      scope : true,
      priority:97,
      link : function( $scope, $el, $attrs){
        var tmp = $attrs['gmData'].split("as").map(function(r){ return r.replace(/\s/g,"")})
        var data = (new Function( "return " + tmp[0] ))()
        var alias = tmp[1]
        $scope[alias] = data
        console.log( alias)
        data.watch(function(){
          $scope.$digest()
        })
      }
    }
  })
  .gmDirective("userCardForm", function(){
    return {
      //require : "gmSource",
      priority : 98,
      template:
      '<div role="input">'+
      '    <input type="text" ng-model="user.name">'+
      '    <input type="text" ng-model="user.gender">'+
      '</div>'+
      '    <button role="save" ng-click="user.save()">save</button>'+
      '    <div>{{user.$$saving}}</div>'+
      '    <div>{{user.name}}</div>'+
      '    <div>{{user.$$saved}}</div>',
      link : function( $scope, $el, $attrs){
        console.log("watch $$saved")
          $scope.user.watch("$$saved", function( saved ){
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
          background : "#eee"
        })
        //$el.hide()



        $el[0].open = function(){
          $el.show()
        }



        $el[0].hide = function(){
          console.log("closing")
          $el.hide()
        }
      }
    }

  })