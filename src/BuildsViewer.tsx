import { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument, useRepo } from "@automerge/automerge-repo-react-hooks";
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from "react-dom";
import toast, { Toaster } from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as R from 'remeda';
import { Build, BuildsDoc, getFileContents, getLatestBuild, getLatestSuccessfulBuild } from './lp-shared';
import { InfoStuff } from "./InfoStuff";


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

export const BuildsViewer = memo((props: {
  buildsUrl: string,
  infoSlot?: HTMLDivElement | null,
}) => {
  const { buildsUrl, infoSlot } = props;

  const [ doc, _changeDoc ] = useDocument<BuildsDoc>(buildsUrl as AutomergeUrl | undefined);

  useEffect(() => {
    if (!doc) {
      toast.loading("loading from Automerge...", { id: "toast" });
    } else if (!doc.builds) {
      toast.error("misformatted Automerge doc", { id: "toast" });
      console.error("misformatted Automerge doc", doc);
    }
    // TODO: put something in info box?
  }, [doc]);

  const [ ownInfoSlot, setOwnInfoSlot ] = useState<HTMLDivElement | null>(null);
  const [ docInfoSlot, setDocInfoSlot ] = useState<HTMLDivElement | null>(null);

  const infoSlotToUse = infoSlot || ownInfoSlot;

  return <>
    {/* <h1>lp-viewer <span style={{fontStyle: "italic", fontSize: 'initial', fontWeight: 'initial'}}>{url}</span></h1> */}
    <div>
      { doc && doc.builds && docInfoSlot &&
          <UrlInnerWithDoc doc={doc} infoElem={docInfoSlot} />
      }
    </div>

    <Toaster />

    { infoSlotToUse && createPortal(<>
      { infoSlot && <div>  {/* only show this if we're embedded in a page watcher */}
          monitoring builds at <span style={{fontStyle: "italic"}}>{buildsUrl}</span>
        </div>
      }
      <div ref={setDocInfoSlot} />
    </>, infoSlotToUse) }

    { !infoSlot && <InfoStuff setSlot={setOwnInfoSlot} /> }
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
