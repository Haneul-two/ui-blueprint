import { useMemo } from 'react'
import { KNOWN_TYPES } from '../blocks/registry'
import { loadDesignRaw } from '../model/storage'
import { validateDesign } from '../model/validate'
import { FIXTURES } from '../presets'
import { Editor } from '../editor/Editor'

/** 저장된 설계를 읽어 편집기를 연다. ?fixture=이름 이면 고정 설계(검증용)를 연다. */
export function EditPage({ id, fixture }: { id: string; fixture?: string }) {
  const result = useMemo(() => {
    // 자기 속성만 본다. 안 그러면 ?fixture=__proto__ 같은 주소가 객체를 함수로 불러 화면이 멈춘다.
    if (fixture && Object.hasOwn(FIXTURES, fixture)) return { ok: true as const, design: { ...FIXTURES[fixture](), id } }
    return validateDesign(loadDesignRaw(id), KNOWN_TYPES)
  }, [id, fixture])
  if (!result.ok)
    return (
      <div className="ub-view ub-view--center">
        <strong>설계를 찾지 못했습니다.</strong>
        <p>이 브라우저에 저장된 설계가 아니거나 지워졌습니다. 다른 기기에서 만든 설계라면 공유 링크나 설계 파일로 옮겨 오세요.</p>
        <a className="ub-btn ub-btn--primary" href="#/">
          설계 목록으로
        </a>
      </div>
    )
  return <Editor key={id} initial={result.design} />
}
