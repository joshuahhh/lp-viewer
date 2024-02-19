import { AutomergeUrl, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { RepoContext, useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from "react-dom";
import toast, { Toaster } from 'react-hot-toast';
import { BsInfoLg } from "react-icons/bs";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useParams } from 'react-router-dom';
import * as R from 'remeda';
import { Build, BuildsDoc, getFileContents, getLatestBuild, getLatestSuccessfulBuild } from './lp-shared';


// TODO:
// [x] header/footer
// [ ] info box z-index
// [ ] avoid flicker & scroll loss when new PDF loads
// [ ] width resizing
// [ ] page virtualization
// [ ] images from internet URLs?
// [ ] store pdfs in separate docs, cuz garbage collection isn't a thing yet
// [ ] sticky success?


type OnDocumentLoadSuccess = NonNullable<React.ComponentProps<typeof Document>['onLoadSuccess']>;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export const Url = memo(() => {
  const repoRef = useRef<Repo>();
  if (!repoRef.current) {
    const networkAdapter = new BrowserWebSocketClientAdapter("wss://sync.automerge.org", 500);
    repoRef.current = new Repo({ network: [ networkAdapter ] });
  }

  return <RepoContext.Provider value={repoRef.current}>
    <UrlInner />
  </RepoContext.Provider>;
});

const UrlInner = memo(() => {
  const { url } = useParams();
  const [ doc, _changeDoc ] = useDocument<BuildsDoc>(url as AutomergeUrl | undefined);

  useEffect(() => {
    if (!doc) {
      toast.loading("loading from Automerge...", { id: "toast" });
    } else if (!doc.builds) {
      toast.error("misformatted Automerge doc", { id: "toast" });
    }
    // TODO: put something in info box?
  }, [doc]);

  const [ showInfo, setShowInfo ] = useState(false);
  const [ infoElem, setInfoElem ] = useState<HTMLDivElement | null>(null);

  return <>
    {/* <h1>lp-viewer <span style={{fontStyle: "italic", fontSize: 'initial', fontWeight: 'initial'}}>{url}</span></h1> */}
    <div>
      { doc && doc.builds && infoElem &&
          <UrlInnerWithDoc doc={doc} infoElem={infoElem} />
      }
    </div>
    <Toaster />
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        margin: 15,
        fontSize: 20,
        cursor: 'pointer',
        // background: '#aaa',
        // color: '#fff',
        background: '#fff',
        color: "#363636",
        borderRadius: 100,
        width: 30,
        height: 30,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
      }}
      onClick={() => setShowInfo(!showInfo)}
    >
      <BsInfoLg/>
    </div>
    <div
      className="bottom-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 50,
        left: 50,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 99,
      }}
    >
      <div
        className="info"
        style={{
          margin: 15,
          background: 'white',
          color: '#363636',
          borderRadius: 10,
          padding: 15,
          display: showInfo ? 'block' : 'none',
          boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div>
          monitoring builds at <span style={{fontStyle: "italic"}}>{url}</span>
        </div>
        <div ref={setInfoElem}/>
      </div>
    </div>
  </>;
});

const UrlInnerWithDoc = memo((props: {
  doc: BuildsDoc,
  infoElem: HTMLDivElement,
}) => {
  const { doc, infoElem } = props;

  const latestBuild = useMemo(() => getLatestBuild(doc), [doc]);
  const latestSuccessfulBuild = useMemo(() => getLatestSuccessfulBuild(doc), [doc]);

  useEffect(() => {
    if (!latestBuild) {
      toast.error("no builds", { id: "toast" });
    } else if (!latestBuild.result) {
      toast.loading(<>building <CountFrom startTime={latestBuild.startTime}/></>, { id: "toast" });
    } else if (!latestBuild.result.ok) {
      console.error(latestBuild.result.stderr);
      toast.error(`error: ${latestBuild.result.error}\n(check console)`, { id: "toast", duration: Infinity });
    } else {
      toast.success("success", { id: "toast" });
    }
  }, [latestBuild])

  return <div>
    { latestSuccessfulBuild
      ? <PDFViewer build={latestSuccessfulBuild} infoElem={infoElem} />
      : <div> no successful builds </div>
    }
    { createPortal(
      <>
        {latestSuccessfulBuild && <div>
          showing build <span style={{fontStyle: "italic"}}>{latestSuccessfulBuild.id}</span>
          { latestBuild && latestBuild.id === latestSuccessfulBuild.id && " (latest)" }
        </div>}
        {latestBuild && latestBuild.id !== latestSuccessfulBuild?.id && <div>
          latest build <span style={{fontStyle: "italic"}}>{latestBuild.id}</span>
        </div>}
      </>,
      infoElem
    ) }
  </div>;
});

function getSeconds() {
  return Math.floor(Date.now() / 1000);
}

const CountFrom = memo((props: { startTime: Date }) => {
  const { startTime } = props;
  const [ seconds, setSeconds ] = useState(getSeconds());
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(getSeconds());
    }, 10);
    return () => clearInterval(interval);
  }, []);
  return <>{seconds - Math.floor(startTime.getTime() / 1000)}s</>;
});

type PDF = {
  id: string,
  blob: Blob,
  numPages: number | null,  // used to mark whether we're ready to display it
  numPagesRendered: number,
}
type LoadedPDF = PDF & { numPages: number };

const PDFViewer = memo((props: {
  build: Build & { result: { ok: true }},
  infoElem: HTMLDivElement,
}) => {
  const { build } = props;

  const [ pdfs, setPdfs ] = useState<{cur: PDF | null, prev: LoadedPDF | null}>({cur: null, prev: null});

  const repo = useRepo();

  useEffect(() => {
    async function go() {
      const contents = await getFileContents(repo, build.result.value.pdfUrl);
      const blob = new Blob([contents], {type: 'application/pdf'});
      setPdfs((oldPdfs) => {
        return {
          cur: { id: build.id, blob, numPages: null, numPagesRendered: 0 },
          prev: oldPdfs.cur?.numPages !== null ? oldPdfs.cur as LoadedPDF : oldPdfs.prev,
        };
      });
    }
    go();
  }, [build, repo]);

  const onDocumentLoadSuccess: OnDocumentLoadSuccess = useCallback((pdf) => {
    setPdfs((oldPdfs) => ({
      ...oldPdfs,
      cur: { ...oldPdfs.cur!, numPages: pdf.numPages },
    }));
  }, []);

  const onPageLoadSuccess = useCallback(() => {
    setPdfs((oldPdfs) => ({
      ...oldPdfs,
      cur: {...oldPdfs.cur!, numPagesRendered: oldPdfs.cur!.numPagesRendered + 1},
    }));
  }, []);

  const [ scroller, setScroller ] = useState<HTMLDivElement | null>(null);
  const [ scrollerWidth, setScrollerWidth ] = useState<number | null>(null);
  useEffect(() => {
    if (!scroller) { return; }
    const yesScroller = scroller;
    function onResize() {
      setScrollerWidth(yesScroller.getBoundingClientRect().width);
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    }
  }, [scroller]);

  const curPageAllReady = pdfs.cur && (pdfs.cur.numPages === pdfs.cur.numPagesRendered);

  return <div>
    {/* <div>{build.id}</div> */}
    <div className="scroller" ref={setScroller}>
      {/* <div>curPageAllReady: {curPageAllReady ? "true" : "false"}</div>
      <div>pdfs.cur: {pdfs.cur?.numPagesRendered} / {pdfs.cur?.numPages}</div>
      <div>pdfs.prev: {pdfs.prev?.numPagesRendered} / {pdfs.prev?.numPages}</div> */}
      { [
        pdfs.prev && !curPageAllReady &&
          <Document
            key={pdfs.prev.id}
            file={pdfs.prev.blob}
            className="pdfs-prev"
          >
            <div
              className="pages"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                width: 'fit-content'
              }}
            >
            { pdfs.prev.numPages && scrollerWidth !== null && R.range(1, pdfs.prev.numPages + 1).map((pageNum) =>
              <Page key={pageNum} pageNumber={pageNum} width={scrollerWidth}/>
            )}
            </div>
          </Document>,
        pdfs.cur &&
          <Document
            key={pdfs.cur.id}
            file={pdfs.cur.blob}
            onLoadSuccess={pdfs.cur.numPages === null ? onDocumentLoadSuccess : undefined}
            className={"pdfs-cur " + (!curPageAllReady ? "visibility-hidden" : "")}
          >
            <div
              className="pages"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                width: 'fit-content'
              }}
            >
            { pdfs.cur.numPages && scrollerWidth !== null && R.range(1, pdfs.cur.numPages + 1).map((pageNum) =>
              <Page
                key={pageNum}
                pageNumber={pageNum}
                width={scrollerWidth}
                onRenderSuccess={pdfs.cur!.numPagesRendered < pdfs.cur!.numPages! ? onPageLoadSuccess : undefined}
              />
            )}
            </div>
          </Document>,
      ] }
      { createPortal(
        pdfs.cur && <div>
          <a
            href={URL.createObjectURL(pdfs.cur.blob)}
            target="_blank" rel="noreferrer"
          >
            ⬇ download pdf
          </a>
        </div>,
        props.infoElem
      ) }
    </div>
  </div>
});
