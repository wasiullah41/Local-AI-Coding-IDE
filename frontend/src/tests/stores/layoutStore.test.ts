import { describe, it, expect, beforeEach } from 'vitest';
import {
    useLayoutStore,
    SIDEBAR_VIEWS,
    SIDEBAR_MIN_WIDTH,
    SIDEBAR_MAX_WIDTH,
    AI_PANEL_MIN_WIDTH,
    AI_PANEL_MAX_WIDTH,
    BOTTOM_PANEL_MIN_HEIGHT,
} from '../../stores/layoutStore';

const reset = () =>
    useLayoutStore.setState({
        activeView: 'explorer',
        sidebarVisible: true,
        sidebarWidth: 260,
        aiPanelVisible: true,
        aiPanelWidth: 400,
        bottomPanelVisible: true,
        bottomPanelHeight: 240,
        bottomPanelTab: 'terminal',
        paletteOpen: false,
    });

describe('LayoutStore', () => {
    beforeEach(reset);

    it('exposes sidebar views that all have a title', () => {
        expect(SIDEBAR_VIEWS).toContain('settings');
        // The assistant has its own panel, so it must not be a sidebar view.
        expect(SIDEBAR_VIEWS).not.toContain('ai' as never);
    });

    it('collapses the sidebar when the active view is picked again', () => {
        const { setActiveView, toggleView } = useLayoutStore.getState();

        setActiveView('search');
        expect(useLayoutStore.getState().activeView).toBe('search');
        expect(useLayoutStore.getState().sidebarVisible).toBe(true);

        // Re-picking the same view collapses it, which is what the activity bar
        // click does; setActiveView itself must never hide anything.
        toggleView('search');
        expect(useLayoutStore.getState().sidebarVisible).toBe(false);

        setActiveView('search');
        expect(useLayoutStore.getState().sidebarVisible).toBe(true);
    });

    it('reopens the sidebar when switching away from a collapsed one', () => {
        const { setActiveView, toggleView } = useLayoutStore.getState();
        toggleView('explorer');
        expect(useLayoutStore.getState().sidebarVisible).toBe(false);

        setActiveView('git');
        expect(useLayoutStore.getState().activeView).toBe('git');
        expect(useLayoutStore.getState().sidebarVisible).toBe(true);
    });

    it('clamps panel widths to their limits', () => {
        const { setSidebarWidth, setAiPanelWidth } = useLayoutStore.getState();

        setSidebarWidth(10);
        expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);

        setSidebarWidth(99_999);
        expect(useLayoutStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);

        setAiPanelWidth(1);
        expect(useLayoutStore.getState().aiPanelWidth).toBe(AI_PANEL_MIN_WIDTH);

        setAiPanelWidth(99_999);
        expect(useLayoutStore.getState().aiPanelWidth).toBe(AI_PANEL_MAX_WIDTH);
    });

    it('sets an absolute size, so a resize handle can report the next value directly', () => {
        const { setSidebarWidth } = useLayoutStore.getState();
        setSidebarWidth(320);
        expect(useLayoutStore.getState().sidebarWidth).toBe(320);
    });

    it('clamps the bottom panel to a usable height', () => {
        const { setBottomPanelHeight } = useLayoutStore.getState();
        setBottomPanelHeight(5);
        expect(useLayoutStore.getState().bottomPanelHeight).toBe(BOTTOM_PANEL_MIN_HEIGHT);
    });

    it('reveals the bottom panel when a tab is selected', () => {
        useLayoutStore.setState({ bottomPanelVisible: false });
        useLayoutStore.getState().setBottomPanelTab('output');
        const state = useLayoutStore.getState();
        expect(state.bottomPanelTab).toBe('output');
        expect(state.bottomPanelVisible).toBe(true);
    });

    it('toggles the AI panel independently of the sidebar', () => {
        const { toggleAiPanel } = useLayoutStore.getState();
        toggleAiPanel();
        expect(useLayoutStore.getState().aiPanelVisible).toBe(false);
        // The sidebar must be untouched by the AI panel toggle.
        expect(useLayoutStore.getState().sidebarVisible).toBe(true);
    });
});
