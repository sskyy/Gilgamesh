(function(){

  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var FN_ARG_SPLIT = /,/;
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

  function annotate (fn) {
    var $inject = [];
    fn = fn.toString();
    var first = fn.replace(STRIP_COMMENTS, '');
    var second = first.match(FN_ARGS)[1];
    var third = second.split(FN_ARG_SPLIT);
    third.forEach(function (arg) {
      arg.replace(FN_ARG, function (all, underscore, name) {
        $inject.push(name);
      });
    });
    return $inject;
  }



  var _module = angular.module
  angular.module = function(){
    var module = _module.apply( angular, arguments)

    module.gmDirective = function(name, directiveDef){
      var directiveDefArgs = annotate( directiveDef )
      var replacedDirectiveDef = function(){
        var directive =  directiveDef.apply( directiveDef, arguments)
        if( !directive.scope ) directive.scope = true

        if( directive.compile ) throw new Error("you cannot wrap a directive with compile")
        if( directive.transclude ) throw new Error("you cannot wrap a directive with transclude")

        directive._template = directive.template
        delete directive.template
        directive.compile = function( $el ){
          if( directive._template ) {
            if( $el.attr('tpl-replace') === undefined ){
              $el.append( directive._template )

            }else if( $el.attr('tpl-replace') == 'role' ){

              var $template = $(directive._template)
              var $children = $el.children().remove()
              $el.append($template)

              $children.each(function(){
                var role = $(this).attr("role"),
                  $roleEl = $(this)

                $el.find("[role="+role+"]").each(function(){
                  if( !$roleEl.html() ){
                    console.log("empty", $roleEl.html())
                    $roleEl.html( $(this).html() )
                  }else{
                    console.log( $roleEl.html())
                  }
                  $(this).replaceWith( $roleEl )
                })
              })
            }
            //deal with import
            var id = $el.attr("id")
            var placeHolders = []
            $("[el-import="+id+"]").each(function(){
              var $importEl = $(this)
              var $placeHolder = $("<div></div>")
              var $clonedEl = $importEl.clone()
              $importEl.replaceWith( $placeHolder )
              placeHolders.push([ $placeHolder, $clonedEl ])
              $el.append( $clonedEl )
            })
          }

          return function( scope, ele, attrs){
            if( directive._template ) {
              window.setTimeout(function(){
                placeHolders.forEach(function(arr){
                  arr[0].replaceWith( arr[1] )
                })
              },1)
            }

            return directive.link( scope, ele, attrs)
          }

        }
        return directive
      }

      replacedDirectiveDef.$inject = directiveDefArgs

      return module.directive( name, replacedDirectiveDef)
    }

    return module
  }

})()







