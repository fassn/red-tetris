import { DependencyList, EffectCallback, useEffect, useRef } from "react";

export function useEffectAfterMount(effect: EffectCallback, deps: DependencyList) {
    const isMounted = useRef(false);

    useEffect(() => {
        if (isMounted.current) return effect();
        else isMounted.current = true;
    }, deps);

    // reset on unmount; in React 18, components can mount again, development only
    // useEffect(() => {
    //     isMounted.current = false;
    // });
}