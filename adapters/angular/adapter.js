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

      function replaceEmptyInnerHTML( $target, $source ){
        if( isEmptyInnerHTML($target) ){
          $target.innerHTML =  $source.innerHTML
        }
      }

      function replaceSourceInnerHTML( $target, $source ){
        if( !isEmptyInnerHTML($source) ){
          $target.innerHTML =  $source.innerHTML
        }
      }

      function isEmptyInnerHTML( el ){
        return /^\s*$/.test( el.innerHTML)
      }

      function replaceWith(  toReplace, target){
        var parent = target.parentNode
        parent.replaceChild( toReplace, target)
      }

      var replacedDirectiveDef = function(){
        var directive =  directiveDef.apply( directiveDef, arguments)
        if( !directive.scope ) directive.scope = true

        if( directive.compile ) throw new Error("you cannot wrap a directive with compile")
        if( directive.transclude ) throw new Error("you cannot wrap a directive with transclude")

        directive._template = directive.template
        delete directive.template


        directive.compile = function( $el ){
          var compilingImportEls = []


          //should only compile once and only compile with the has template
          if( directive._template && $el[0].getAttribute("gm-compiled") ===null) {
            var clonedEl = $el[0].cloneNode(true)
            var _templateHolder = angular.element("<div>"+directive._template+"</div>")[0]


            if( isEmptyInnerHTML(clonedEl) ) {
              clonedEl.innerHTML = directive._template
            }

            if( clonedEl.getAttribute("gm-tpl-include") !==null ){
              angular.forEach( clonedEl.childNodes, function( childEl){
                if( !childEl.getAttribute ) return
                var roleEl = _templateHolder.querySelector("[gm-role="+ childEl.getAttribute("gm-role")+"]")
                if( roleEl ){
                  replaceSourceInnerHTML(roleEl, childEl)
                  replaceWith( roleEl, childEl)
                }
              })
            }


            if( clonedEl.getAttribute('gm-tpl-partial') !==null ){
              //only overwrite particular element
              var $children = $el.children().remove()
              clonedEl.innerHTML = directive._template

              angular.forEach($children,function(roleEl){
                var role = roleEl.getAttribute("gm-role")

                angular.forEach(clonedEl.querySelectorAll("[gm-role="+role+"]"),function( targetEl){
                  replaceEmptyInnerHTML( roleEl, targetEl)
                  replaceWith( roleEl, targetEl)
                })
              })
            }
            //
            //
            if( clonedEl.getAttribute('gm-tpl-exclude') !==null ){
              clonedEl.getAttribute('gm-tpl-exclude').split(",").forEach(function( roleToExclude){
                angular.element(clonedEl.querySelector("[gm-role="+roleToExclude+"]")).remove()
              })
            }

            //handle import with gm-tpl-inject   and handle import with gm-role
            var id = clonedEl.getAttribute("id")
            angular.forEach(document.querySelectorAll("[gm-import="+id+"]"),function(importEl){
              var tobeCompiledCloneEl
              var roleEl

              if( importEl.getAttribute("gm-role")!==null ){
                roleEl = angular.element("<div>"+directive._template+"</div>")[0].querySelector("[gm-role="+ importEl.getAttribute("gm-role")+"]")
                if( roleEl ){
                  tobeCompiledCloneEl = roleEl.cloneNode(true)
                  replaceSourceInnerHTML(tobeCompiledCloneEl, roleEl)
                  tobeCompiledCloneEl.setAttribute("gm-import",id)
                }

              }else{
                tobeCompiledCloneEl = importEl.cloneNode(true)
              }

              clonedEl.appendChild( tobeCompiledCloneEl )
              compilingImportEls.push([ importEl, tobeCompiledCloneEl ])
            })

            clonedEl.getAttribute("gm-compiled",true)
            replaceWith(clonedEl, $el[0])
          }

          return function( scope, ele, attrs){
              window.setTimeout(function(){
                var resetEl
                while( resetEl = compilingImportEls.pop() ){
                  replaceWith( resetEl[1],resetEl[0] )
                }
              },1)

            return directive.link.call(directive, scope, ele, attrs)
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







